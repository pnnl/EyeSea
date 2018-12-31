//This script applies a formatter to the repository,
//but only to the changes in the index. Unstaged changes
//are temporarily removed and restored at the end.

//If anything goes wrong, a temporary stash is restored.

const exitHook = require('async-exit-hook');
const execa = require('execa');

let isRollbackable = false;

function doSyncRollback() {
	console.error('Rolling Back Changes');
	const res = execa.sync('git', ['reset', '--hard']);
	//console.error(res.stdout);
	console.error(res.stderr);
	const res2 = execa.sync('git', ['stash', 'pop', '--index']);
	//console.error(res2.stdout);
	console.error(res2.stderr);
}

function onExit(callback) {
	if (isRollbackable) {
		doSyncRollback();
	}
	if (callback) callback();
}

exitHook(onExit);

async function main() {
	const diff = execa(
		'git',
		['diff', '--ignore-submodules', '--binary', '--no-color'],
		{ encoding: 'buffer', stripEof: false }
	);
	diff.stderr.pipe(process.stderr);
	let diffed;
	try {
		diffed = await diff;
	} catch (e) {
		throw new Error('Could not get unstaged changes');
	}
	const unstaged = diffed.stdout;

	const stash = execa('git', ['stash', 'save', '--keep-index', 'lint-staged']);
	stash.stdout.pipe(process.stdout);
	stash.stderr.pipe(process.stderr);
	try {
		await stash;
	} catch (e) {
		throw new Error('Could not create backup stash');
	}

	isRollbackable = true;

	console.log('Linting...');
	const linting = execa(process.argv[2], process.argv.slice(3));
	linting.stdout.pipe(process.stdout);
	linting.stderr.pipe(process.stderr);

	try {
		await linting;
	} catch (e) {
		throw new Error('Failed to run linter');
	}
	console.log('Linted');

	const add = execa('git', ['add', '-u']);
	add.stdout.pipe(process.stdout);
	add.stderr.pipe(process.stderr);
	try {
		await add;
	} catch (e) {
		throw new Error('Could not add formatting changes to index');
	}

	if (unstaged.length > 0) {
		//Skip if no unstaged changes
		const reapply = execa(
			'git',
			[
				'apply',
				'--whitespace=nowarn',
				'--ignore-space-change',
				'--ignore-whitespace',
				'-v',
				'-',
			],
			{
				input: unstaged,
			}
		);
		reapply.stdout.pipe(process.stdout);
		reapply.stderr.pipe(process.stderr);
		try {
			await reapply;
		} catch (e) {
			throw new Error(
				'Could not reapply unstaged changes (You probably want to format it yourself and restage changes)'
			);
		}
	}

	const cleanup = execa('git', ['stash', 'drop']);
	cleanup.stdout.pipe(process.stdout);
	cleanup.stderr.pipe(process.stderr);
	try {
		await cleanup;
	} catch (e) {
		throw new Error('Could not drop backup stash');
	}

	isRollbackable = false;
}

try {
	const merge = execa.sync('git', [
		'rev-parse',
		'-q',
		'--verify',
		'MERGE_HEAD',
	]);
	if (merge.code === 0) {
		//Skip hook if git merge
		process.exit(0);
	}
} catch (e) {
	//Not a merge
}

main().then(
	() => process.exit(0),
	e => {
		console.error('Error: ' + e.message);
		process.exit(1);
	}
);
