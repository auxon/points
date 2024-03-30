import { spawn } from 'child_process'

const mine = async (
	txid: string,
	difficulty: number,
	work_size?: number
): Promise<{ nonce: string; hash: string }> => {
	return new Promise((res, rej) => {
		let params = ['--txid', txid, '--diff', difficulty.toString()]

		if (work_size) {
			params = params.concat(['--work-size', work_size.toString()])
		}

		const process = spawn(`./pointMinerOSX`, params)
		process.stdout.on('data', (data) => {
			const value = JSON.parse(data.toString('utf8'))
			res(value)
		})
	})
}

export default mine
