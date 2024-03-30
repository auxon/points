//import mine from '../src/mine'
import { expect, use } from 'chai'
import { hash256, sha256, toByteString, int2ByteString } from 'scrypt-ts'
import { HashPoints } from '../src/contracts/hashPoints'
import { getDefaultSigner } from './utils/txHelper'
import { mine } from '../pkg'

// @ts-ignore
import chaiAsPromised from 'chai-as-promised'
use(chaiAsPromised)

const DIFF = BigInt('0x00FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF')
// @ts-ignore
const REDEEM = 5n

describe('Test SmartContract `HashPoints`', () => {
	let instance: HashPoints
	// @ts-ignore
	let points: bigint = 0n

	before(async () => {
		await HashPoints.loadArtifact()

		instance = new HashPoints(DIFF)
		await instance.connect(getDefaultSigner())
	})

	it(`should claim points ${REDEEM} times.`, async () => {
		let tx = await instance.deploy(1)

		console.log(`Deployed contract "HashPoints": ${tx.id}`)

		for (let i = 0; i < REDEEM; i++) {
			const call = async () => {
				// @ts-ignore
				//const solution = await mine(tx.id, 2n, 1000)
				const solution = await mine(tx.id, 2n, 1000)
				const p = DIFF / BigInt(`0x${solution.hash}`)
				points = p + points
				const res = await instance.methods.claim(toByteString(solution.nonce))
				return res
			}

			const res = call()
			await expect(res).not.to.be.rejected
			tx = (await res).tx
			instance = HashPoints.fromTx(tx, 0)
			await instance.connect(getDefaultSigner())
			expect(points).to.equal(instance.points)
		}
	})

	// @ts-ignore
	it(`should redeem points`, async () => {
		const call = async () => {
			const str = toByteString('boden', true)
			// @ts-ignore
			const res = await instance.methods.redeem(points - 1n, str)
			// @ts-ignore
			points = 1n
			return res
		}

		const res = call()
		await expect(res).not.to.be.rejected
		const tx = (await res).tx
		instance = HashPoints.fromTx(tx, 0)
		await instance.connect(getDefaultSigner())

		// @ts-ignore
		expect(instance.points).to.equal(1n)
	})
})
