'use strict';

import vscode = require('vscode');
import cp = require('child_process');
import path = require('path');
import fs = require('fs');

export function parseDefinitionLocation(output: string): vscode.Definition {

	var items: vscode.Location[] = new Array<vscode.Location>();
	output.split(/\r?\n/)
		.forEach(function (value, index, array) {

			if (value != null && value != "") {

				let values = value.split(/ +/);

				// Create            113 C:/Users/alefr/Downloads/SynEdit-2_0_8/SynEdit/Source/SynURIOpener.pas constructor Create(AOwner: TComponent); override;
				let word = values.shift();
				let line = parseInt(values.shift()) - 1;

				// together again get the filename (which may contains spaces and the previous shift wouldn't work)
				let filePath: string;
				if (values[2].indexOf(word + '(') == 0) {
					filePath = path.join(vscode.workspace.rootPath, values.shift());
				} else {
					let rest: string = values.join(' ');
					let idxProc: number = rest.search(/(class\s+)?\b(procedure|function|constructor|destructor)\b/gi);
					filePath = rest.substr(0, idxProc - 1);
					filePath = path.join(vscode.workspace.rootPath, filePath);
				}

				let definition = new vscode.Location(
					vscode.Uri.file(filePath), new vscode.Position(line, 0)
				);

				items.push(definition);
			}

		});

	return items;
}

export function definitionLocations(word: string): Promise<vscode.Definition> {

	return new Promise<vscode.Definition>((resolve, reject) => {

		let p = cp.execFile('global', ['-x', word], { cwd: vscode.workspace.rootPath }, (err, stdout, stderr) => {
			try {
				if (err && (<any>err).code === 'ENOENT') {
					vscode.window.showInformationMessage('The "global" command is not available. Make sure it is on PATH');
				}
				if (err) return resolve(null);
				let result = stdout.toString();
				// console.log(result);
				let locs = <vscode.Definition>parseDefinitionLocation(result);
				return resolve(locs);
			} catch (e) {
				reject(e);
			}
		});
	});
}

export class PascalDefinitionProvider implements vscode.DefinitionProvider {

	public provideDefinition(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken): vscode.Definition | Thenable<vscode.Definition> {
		let fileName: string = document.fileName;
		let word = document.getText(document.getWordRangeAtPosition(position)).split(/\r?\n/)[0];
		return definitionLocations(word).then(locs => {
			return locs;
		});
	}
}
