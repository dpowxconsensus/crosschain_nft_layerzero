import { expect } from "chai";
import { ethers, upgrades } from "hardhat";

import config from "../utils/config";
const { goerli, fuji, arbitriumGoerli } = config;

describe("NFT", function () {
  // We define a fixture to reuse the same setup in every test.
  // We use loadFixture to run this setup once, snapshot that state,
  // and reset Hardhat Network to that snapshot in every test.
  beforeEach(async function () {
    // use this chainId
    this.srcId = 1;
    this.dstId = 2;

    // create a LayerZero Endpoint mock for testing
    const LayerZeroEndpointMock = await ethers.getContractFactory(
      "LZEndpointMock"
    );
    this.lzEndpointMockSrc = await LayerZeroEndpointMock.deploy(this.srcId);
    this.lzEndpointMockDst = await LayerZeroEndpointMock.deploy(this.dstId);

    // create two nft instances
    const NFT = await ethers.getContractFactory("NFT");
    this.nftSrc = await upgrades.deployProxy(NFT, [
      this.lzEndpointMockSrc.address,
    ]);
    this.nftDst = await upgrades.deployProxy(NFT, [
      this.lzEndpointMockDst.address,
    ]);

    await this.lzEndpointMockSrc.setDestLzEndpoint(
      this.nftDst.address,
      this.lzEndpointMockDst.address
    );
    await this.lzEndpointMockDst.setDestLzEndpoint(
      this.nftSrc.address,
      this.lzEndpointMockSrc.address
    );

    // set each contracts source address so it can send to each other
    await this.nftSrc.setTrustedRemote(
      this.dstId,
      ethers.utils.solidityPack(
        ["address", "address"],
        [this.nftDst.address, this.nftSrc.address]
      )
    );
    await this.nftDst.setTrustedRemote(
      this.srcId,
      ethers.utils.solidityPack(
        ["address", "address"],
        [this.nftSrc.address, this.nftDst.address]
      )
    );

    // listening events here
    // this.nftSrc.on("SendNFTCrossChain", (from, to, dstId, tokenId) => {
    //   console.log(
    //     `nft sent from ${from} to ${to} to chain with chainId ${dstId} and with tokenId ${tokenId}`
    //   );
    // });
  });

  it("EndPoint Setup and nft deployment to chains", () => {});

  it("Cross Chain NFT Transfer", async function () {
    const [owner, otherAddress] = await ethers.getSigners();
    await this.nftSrc.safeMint(owner.address, "uri", {
      from: owner.address,
      value: 1, // 1 wei required to mint
    });
    await owner.sendTransaction({
      to: this.nftSrc.address,
      value: ethers.utils.parseEther("1.0"),
    });

    // const adapterParam = ethers.utils.solidityPack(
    //   ["uint16", "uint256"],
    //   [1, 225000]
    // );

    // let nativeFee = (
    //   await this.nftSrc.estimateSendFee(
    //     this.dstId,
    //     this.nftDst.address,
    //     0,
    //     false,
    //     adapterParam
    //   )
    // ).nativeFee;

    // v1 adapterParams, encoded for version 1 style, and 200k gas quote
    // let _adapterParams = ethers.utils.solidityPack(
    //   ["uint16", "uint256"],
    //   [1, 200000]
    // );
    let _adapterParams = "0x";

    // const payload = ethers.utils.solidityPack(
    //   ["uint256", "address", "uint256"],
    //   [this.dstId, this.nftDst.address, 0]
    // );

    const payload = "0x";
    const _useZro = false;

    // let nativeFee = (
    //   await this.lzEndpointMockSrc.estimateFees(
    //     this.dstId,
    //     this.nftSrc.address,
    //     payload,
    //     _useZro,
    //     _adapterParams
    //   )
    // ).nativeFee; // native fee < as required

    let nativeFee = ethers.utils.parseEther("1.0");
    expect(await this.nftSrc.ownerOf(0)).to.be.equal(owner.address);
    await expect(
      this.nftSrc.transferNFTCrossChain(
        this.dstId,
        this.nftDst.address,
        owner.address,
        0,
        {
          from: owner.address,
          value: nativeFee,
        }
      )
    ).to.emit(this.nftSrc, "SendNFTCrossChain");

    expect(await this.nftDst.ownerOf(0)).to.be.equal(owner.address);
  });
});
