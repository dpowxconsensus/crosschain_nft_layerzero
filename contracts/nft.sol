// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "./lzApp/NonblockingLzApp.sol";

contract NFT is
    ERC721,
    ERC721URIStorage,
    ERC721Burnable,
    Ownable,
    NonblockingLzApp
{
    event SendNFTCrossChain(
        address from,
        address to,
        uint256 dstId,
        uint256 tokenId
    );

    event NFTReceivedFromChain(
        address from,
        address to,
        uint256 _srcChainId,
        uint256 tokenId
    );

    using Counters for Counters.Counter;

    Counters.Counter private _tokenIdCounter;

    constructor(
        address _endpoint
    ) ERC721("NFT", "SNFT") NonblockingLzApp(_endpoint) {}

    function _safeMint(address to, string memory uri) internal {
        uint256 tokenId = _tokenIdCounter.current();
        _tokenIdCounter.increment();
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, uri);
    }

    function safeMint(address to, string memory uri) public onlyOwner {
        _safeMint(to, uri);
    }

    // The following functions are overrides required by Solidity.

    function _burn(
        uint256 tokenId
    ) internal override(ERC721, ERC721URIStorage) {
        super._burn(tokenId);
    }

    function tokenURI(
        uint256 tokenId
    ) public view override(ERC721, ERC721URIStorage) returns (string memory) {
        return super.tokenURI(tokenId);
    }

    function transferNFTCrossChain(
        uint16 _dstChainId,
        address _dstAddress,
        address to,
        uint256 tokenId
    ) public payable {
        require(
            address(this).balance > 0,
            "the balance of this contract is 0. pls send gas for message fees"
        );

        // encode the payload with the number of pings
        bytes memory payload = abi.encode(
            tokenId,
            tokenURI(tokenId),
            to,
            msg.sender,
            _dstAddress
        );
        // use adapterParams v1 to specify more gas for the destination
        uint16 version = 1;
        uint gasForDestinationLzReceive = 350000;
        bytes memory adapterParams = abi.encodePacked(
            version,
            gasForDestinationLzReceive
        );

        // send LayerZero message
        _lzSend( // {value: messageFee} will be paid out of this contract!
            _dstChainId, // destination chainId
            payload, // abi.encode()'ed bytes
            payable(this), // (msg.sender will be this contract) refund address (LayerZero will refund any extra gas back to caller of send()
            address(0x0), // future param, unused for this example
            adapterParams, // v1 adapterParams, specify custom destination gas qty
            msg.value
        );
        emit SendNFTCrossChain(msg.sender, to, _dstChainId, tokenId);
        _burn(tokenId); // burn the nft on src chain
    }

    function _nonblockingLzReceive(
        uint16 _srcChainId,
        bytes memory _srcAddress,
        uint64 /*_nonce*/,
        bytes memory _payload
    ) internal override {
        // use assembly to extract the address from the bytes memory parameter
        address sendBackToAddress;
        assembly {
            sendBackToAddress := mload(add(_srcAddress, 20))
        }

        // decode the tokenId from src chain here
        (
            uint256 tokenId,
            string memory tokenUri,
            address to,
            address from,
            address _dstAddress
        ) = abi.decode(_payload, (uint, string, address, address, address));

        require(_dstAddress == address(this), "Invalid DstAddress");
        // mint nft on dst chain (with same tokenid or with incremented tokenid)
        _safeMint(to, tokenUri);
        emit NFTReceivedFromChain(from, to, _srcChainId, tokenId);
    }

    // allow this contract to receive ether
    receive() external payable {}
}
