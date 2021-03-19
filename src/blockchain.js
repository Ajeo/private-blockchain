/**
 *                          Blockchain Class
 *  The Blockchain class contain the basics functions to create your own private blockchain
 *  It uses libraries like `crypto-js` to create the hashes for each block and `bitcoinjs-message`
 *  to verify a message signature. The chain is stored in the array
 *  `this.chain = [];`. Of course each time you run the application the chain will be empty because and array
 *  isn't a persisten storage method.
 *
 */

const SHA256 = require('crypto-js/sha256');
const BlockClass = require('./block.js');
const bitcoinMessage = require('bitcoinjs-message');

const asyncForEach = async (
    array,
    callback
  ) => {
    for (let index = 0; index < array.length; index++) {
      await callback(array[index], index, array)
    }
  }


class Blockchain {
    constructor() {
        this.chain = [];
        this.height = -1;
        this.initializeChain();
    }

    async initializeChain() {
        if ( this.height === -1) {
            let block = new BlockClass.Block({data: 'Genesis Block'});
            await this._addBlock(block);
        }
    }

    getChainHeight() {
        return new Promise((resolve, reject) => {
            resolve(this.height);
        });
    }

    _addBlock(block) {
        let self = this;
        return new Promise(async (resolve, reject) => {
            try {
                block.height = self.chain.length;
                block.time = new Date().getTime().toString().slice(0,-3);

                if (self.chain.length > 0) {
                    block.previousBlockHash = self.chain[self.chain.length - 1].hash;
                }

                block.hash = SHA256(JSON.stringify(block)).toString();

                self.chain.push(block);
                self.height = self.chain.length;
                resolve(block);
            } catch (error) {
                reject(error);
            }
        });
    }

    requestMessageOwnershipVerification(address) {
        return new Promise((resolve, reject) => {
            try {
                const message = `${address}:${new Date().getTime().toString().slice(0,-3)}:starRegistry`;
                resolve(message);
            } catch (error) {
                reject(error);
            }
        });
    }

    submitStar(address, message, signature, star) {
        let self = this;
        return new Promise(async (resolve, reject) => {
            const errorLog = await self.validateChain();

            if (errorLog.length === 0) {
                const currentTime = parseInt(new Date().getTime().toString().slice(0, -3));
                const messageTime = parseInt(message.split(':')[1]);

                if (messageTime + 5 * 60 < currentTime) {
                    reject("5 minute exceeded");
                    return;
                }

                if (!bitcoinMessage.verify(message, address, signature)) {
                    reject("Invalid Signature");
                    return;
                }

                try {
                    const block = await self._addBlock(new BlockClass.Block({ address, star }));
                    resolve(block);
                } catch (error) {
                    reject(error);
                }
            } else {
                reject(errorLog);
            }
        });
    }

    getBlockByHash(hash) {
        let self = this;
        return new Promise((resolve, reject) => {
            const result = self.chain.filter((b) => b.hash === hash);

            if (result.length) {
                resolve(result[0]);
            } else {
                reject("Block not found");
            }
        });
    }

    getBlockByHeight(height) {
        let self = this;
        return new Promise((resolve, reject) => {
            let block = self.chain.filter(p => p.height === height)[0];
            if(block){
                resolve(block);
            } else {
                resolve(null);
            }
        });
    }

    getStarsByWalletAddress (address) {
        let self = this;
        let stars = [];
        return new Promise(async (resolve, reject) => {
            try {
                await asyncForEach(self.chain, async (block, index) => {
                    if (index !== 0) {
                        const data = await block.getBData();
                        if (data && data.address === address) stars.push(data);
                    }
                });

                resolve(stars);
            } catch (error) {
                reject(error);
            }
        });
    }

    validateChain() {
        let self = this;
        let errorLog = [];
        return new Promise(async (resolve, reject) => {
            try {
                let previousBlockHash;
                await asyncForEach(self.chain, async (block) => {
                    const isValid = await block.validate();

                    if (!isValid) {
                        errorLog.push(`Block ${block.hash} is invalid`);
                    }

                    if (block.height !== 0 && block.previousBlockHash !== previousBlockHash) {
                        errorLog.push(`Block ${block.hash} has invalid hash`);
                    }

                    previousBlockHash = block.hash;
                });

                resolve(errorLog);
            } catch (error) {
                reject(error);
            }
        });
    }

}

module.exports.Blockchain = Blockchain;
