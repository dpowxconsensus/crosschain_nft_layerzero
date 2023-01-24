import { readFile, writeFile } from "node:fs/promises";
import { access, constants, mkdir } from "node:fs";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
const LZ_ENDPOINTS = require("../constants/layerzeroEndpoints.json");

const isFileExist = (path: string) => {
  return new Promise((resolve, reject) => {
    access(path, constants.F_OK, (err) => {
      if (err) return resolve(false);
      resolve(true);
    });
  });
};

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, network } = hre;
  const { deployer } = await getNamedAccounts();

  const lzEndpointAddress = LZ_ENDPOINTS[network.name];
  console.log(`[${network.name}] Endpoint Address: ${lzEndpointAddress}`);

  const { deploy } = deployments;
  const nft = await deploy("NFT", {
    from: deployer,
    args: [lzEndpointAddress],
    log: true,
    autoMine: true, // speed up deployment on local network (ganache, hardhat), no effect on live networks
  });

  const path = `${__dirname}/artifacts`;

  if (!(await isFileExist(`${path}`))) {
    await new Promise((resolve, reject) => {
      mkdir(path, { recursive: true }, (err) => {
        if (err) return reject("erro while creating dir");
        resolve("created");
      });
    });
  }

  if (!(await isFileExist(`${path}/deploy.json`))) {
    await writeFile(`${path}/deploy.json`, "{}");
  }

  const prevDetails = await readFile(`${path}/deploy.json`, {
    encoding: "utf8",
  });

  const prevDetailsJson: { [network: string]: string } = await JSON.parse(
    prevDetails
  );
  let newDeployData = { ...prevDetailsJson, [network.name]: nft.address };
  await writeFile(`${path}/deploy.json`, JSON.stringify(newDeployData));
  console.log("Deploy file updated successfully!");
};
export default func;
func.tags = ["NFT"];
