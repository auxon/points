import mine from './src/mine'
import { readFileSync, writeFileSync } from 'fs'
import { HashPoints } from './src/contracts/hashPoints'
import {
	bsv,
	TestWallet,
	DefaultProvider,
	sha256,
	toByteString,
	hash256,
	int2ByteString,
} from 'scrypt-ts'

import * as dotenv from 'dotenv'

// Load the .env file
dotenv.config()

if (!process.env.PRIVATE_KEY) {
	throw new Error(
		'No "PRIVATE_KEY" found in .env, Please run "npm run genprivkey" to generate a private key'
	)
}

// Read the private key from the .env file.
// The default private key inside the .env file is meant to be used for the Bitcoin testnet.
// See https://scrypt.io/docs/bitcoin-basics/bsv/#private-keys
const privateKey = bsv.PrivateKey.fromWIF(process.env.PRIVATE_KEY || '')

// Prepare signer.
// See https://scrypt.io/docs/how-to-deploy-and-call-a-contract/#prepare-a-signer-and-provider
const signer = new TestWallet(
	privateKey,
	new DefaultProvider({
		network: bsv.Networks.testnet,
	})
)

async function main() {
	await signer.connect()
	await HashPoints.loadArtifact()

	let txid = readFileSync('mine.txt').toString('utf8').trim()
	let tx = await signer.connectedProvider.getTransaction(txid)
	let instance = HashPoints.fromTx(tx, 0)
	await instance.connect(signer)

	console.log(`points: ${instance.points}`)

	while (true) {
		const { nonce } = await mine(txid, 8)
		const res = await instance.methods.claim(toByteString(nonce))
		tx = res.tx
		txid = tx.id
		writeFileSync('mine.txt', Buffer.from(txid, 'utf8'))

		instance = HashPoints.fromTx(tx, 0)
		await instance.connect(signer)
	}
}

main()
