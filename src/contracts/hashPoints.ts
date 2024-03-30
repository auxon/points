import {
	assert,
	ByteString,
	method,
	prop,
	sha256,
	Sha256,
	SmartContract,
	hash256,
	toByteString,
	byteString2Int,
	SigHash,
	bsv,
	MethodCallOptions,
	Utils,
	reverseByteString,
} from 'scrypt-ts'

export class HashPoints extends SmartContract {
	@prop(true)
	points: bigint

	@prop()
	diff_1_target: bigint

	//@prop(true)
	//metadata: ByteString

	constructor(diff: bigint) {
		super(...arguments)
		this.points = 0n
		this.diff_1_target = diff;
		//this.metadata = toByteString('')
	}

	@method()
	public claim(nonce: ByteString) {
		const hash = hash256(this.ctx.utxo.outpoint.txid + nonce)
		const diff = this.diff_1_target / byteString2Int(reverseByteString(hash, 32n))
		assert(diff > 0n, 'minimum difficulty not met')
		this.points = this.points + diff
		const outputs = this.buildStateOutput(this.ctx.utxo.value) + this.buildChangeOutput()
		assert(this.ctx.hashOutputs == hash256(outputs), 'hashOutputs mismatch')
		console.log(`claim("${nonce}"): ${JSON.stringify({ points: this.points })}`)
	}

	@method()
	public redeem(amount: bigint, message: ByteString) {
		assert(amount > 0, 'amount negative')
		assert(amount <= this.points, 'not enough points')
		assert(byteString2Int(message) != 0n, 'no message')
		this.points = this.points - amount;
		const outputs = this.buildStateOutput(this.ctx.utxo.value) + this.buildChangeOutput();
		assert(this.ctx.hashOutputs == hash256(outputs), 'hashOutputs mismatch')
		console.log(`redeem(${amount} "${message}") ${JSON.stringify({ points: this.points })}`);
	}

	//@method()
	//public profile(meta: ByteString) {
		//assert(byteString2Int(meta) != 0n, 'no metadata')
		//this.metadata = meta;
		//const outputs = this.buildStateOutput(this.ctx.utxo.value) + this.buildChangeOutput();
		//assert(this.ctx.hashOutputs == hash256(outputs), 'hashOutputs mismatch')
	//}

	static async buildTxForClaim(
		current: HashPoints,
		options: MethodCallOptions<HashPoints>,
		nonce: ByteString
	) {
		const tx = new bsv.Transaction().addInput(current.buildContractInput())
		const txid = Buffer.from(current.utxo.txId, 'hex').reverse().toString('hex')
		const hash = hash256(txid + nonce)
		const diff = current.diff_1_target / BigInt(`0x${hash}`)
		const next = current.next()
		next.points = next.points + diff
		const stateOutput = Buffer.from(next.buildStateOutput(1n), 'hex');
		tx.addOutput(
			bsv.Transaction.Output.fromBufferReader(new bsv.encoding.BufferReader(stateOutput))
		)
		const defaultAddress = await current.signer.getDefaultAddress()
		tx.change(options.changeAddress || defaultAddress)

		return { tx, atInputIndex: 0, nexts: [] }
	}

	static async buildTxForRedeem(
		current: HashPoints,
		options: MethodCallOptions<HashPoints>,
		amount:  bigint,
		message: ByteString
	) {
		const tx = new bsv.Transaction().addInput(current.buildContractInput())
		const next = current.next()
		next.points = next.points - amount;
		const stateOutput = Buffer.from(next.buildStateOutput(1n), 'hex');
		tx.addOutput(
			bsv.Transaction.Output.fromBufferReader(new bsv.encoding.BufferReader(stateOutput))
		)
		const defaultAddress = await current.signer.getDefaultAddress()
		tx.change(options.changeAddress || defaultAddress)

		return { tx, atInputIndex: 0, nexts: [] }
	}
}
