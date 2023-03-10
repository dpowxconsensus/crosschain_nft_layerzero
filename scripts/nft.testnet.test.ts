import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { assert } from "console";

import deploy from "./../deploy/artifacts/deploy.json";

const { ethers } = require("hardhat");
import chainIds from "./../constants/chainIds.json";

import { abi, bytecode } from "./../artifacts/contracts/nft.sol/NFT.json";
import Spinner from "./../utils/spinner";

import axios from "axios";
const URLS = {
  testnet: "https://api-testnet.layerzero-scan.com",
  mainnet: "https://api-mainnet.layerzero-scan.com",
  sandbox: "https://api-sandbox.layerzero-scan.com",
};
export const createClient = (env, options) => {
  const url = URLS[env];
  if (!url) throw new Error(`No endpoint for env ${env}`);
  const client = axios.create({
    baseURL: url,
  });
  return {
    async getMessagesBySrcTxHash(srcTxHash) {
      if (!srcTxHash) throw new Error("srcTxHash must be provided");
      const { data } = await client.get(`/tx/${srcTxHash}`);
      return data;
    },
  };
};

async function main() {
  const client = createClient("testnet", {});

  const localChain = "goerli";
  const remoteChain = "fuji";
  const jsonURLLocalChain =
    "https://goerli.infura.io/v3/f4d139222fce4c03963c4145d0a30260";
  const jsonURLRemoteChain = "https://api.avax-test.network/ext/bc/C/rpc";
  const localChainId = chainIds[localChain];
  const remoteChainId = chainIds[remoteChain];

  let signerOrigin: SignerWithAddress;
  let signerRemote: SignerWithAddress;

  let nftSrcContract: any;
  let nftDstContract: any;

  let signer: SignerWithAddress;

  let tx;
  let nftOwner;
  let txReceipt;
  let tokenId;

  const setup = async () => {
    signer = ethers.Wallet.fromMnemonic(process.env.MNEMONIC);
    const localChainProvider = new ethers.providers.JsonRpcProvider(
      jsonURLLocalChain
    );
    const remoteChainProvider = new ethers.providers.JsonRpcProvider(
      jsonURLRemoteChain
    );

    signerOrigin = signer.connect(localChainProvider);
    signerRemote = signer.connect(remoteChainProvider);

    nftSrcContract = await ethers.getContractAt(
      abi,
      deploy[localChain],
      signerOrigin
    );

    nftDstContract = await ethers.getContractAt(
      abi,
      deploy[remoteChain],
      signerRemote
    );
  };

  const waitForMessage = (txHash) => {
    return new Promise((resolve, reject) => {
      setInterval(async () => {
        client.getMessagesBySrcTxHash(txHash).then(async (result) => {
          if (!result.messages.length) return;
          if (result.messages[0].status == "FAILED") {
            reject(result.messages[0]);
          } else if (result.messages[0].status == "DELIVERED") {
            resolve(result.messages[0]);
          } else console.log("Relayer: message is inflight");
        });
      }, 2000); // every 2sec
    });
  };

  const testNFTFLOW = async () => {
    tx = await nftSrcContract
      .connect(signerOrigin)
      .safeMint(signerOrigin.address, "URI", {
        // value: 1, // wei, previosly deployed contract mint can only be done by owner of contract
      });
    console.log("mint tx sent successfully with tx hash: ", tx.hash);
    txReceipt = await tx.wait();
    // before sending
    tokenId = parseInt(txReceipt.logs[0].data, 10);
    console.log("SRC Chain: NFT minted with tokenId ", tokenId);

    nftOwner = await nftSrcContract.connect(signerOrigin).ownerOf(tokenId); // should be equal to signerOrigin.address

    assert(
      nftOwner == signerOrigin.address,
      "srcchain: minted to someone else"
    );

    tx = await nftSrcContract
      .connect(signerOrigin)
      .transferNFTCrossChain(
        remoteChainId,
        deploy[remoteChain],
        signerOrigin.address,
        tokenId,
        {
          value: ethers.utils.parseEther("0.25"),
        }
      );
    console.log("nft transfer: tx sent successfully with tx hash: ", tx.hash);
    txReceipt = await tx.wait();
    console.log(
      "SRC chain: nft transfer went successfull on src chain, let's wait for message to be delivered to dst chain"
    );

    // getting empty message array for a while
    // new Spinner().spin("dots");
    // const message = await waitForMessage(tx.hash);
    // console.log(
    //   "DST chain: transaction went on dst chain with tx hash ",
    //   message.dstTxHash
    // );

    nftOwner = await nftDstContract.ownerOf(tokenId);
    assert(
      nftOwner == signerOrigin.address,
      "srcchain: minted to someone else"
    );
  };

  setup()
    .then(async () => {
      console.log("Setup completed !!");
      await testNFTFLOW();
    })
    .catch(console.log);
}

main()
  .then(() => console.info("Test completed cross chain !!"))
  .catch(console.error);
