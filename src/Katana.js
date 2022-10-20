/*
	Copyright (c) 2022 Michael Gummere
	All rights reserved.
	Redistribution and use in source and binary forms governed under the terms of the zlib/libpng License with Acknowledgement license.
*/

const fs = require("fs");
const path = require("path");

/**
	* Katana Datastore
	* @param {String} dbPath Relative path to the datastorefolder
	* @param {Object} options Object containing options for the datastore
	* @ignore
*/
class Katana {
	constructor(dsPath, options) {
		this.strPath = path.join(dsPath, "store.json");
		this.libPath = path.join(dsPath, "library.json");
		this.encryptOpt = {
			enable: options.encrypt,
			seedPath: path.join(dsPath, "seed.txt"),
			seed: 0
		};
		this.store = [];
		this.library = {};

		if (options.saveToDisk) {
			if (fs.existsSync(this.strPath) && fs.existsSync(this.libPath)) {
				this.library = JSON.parse(fs.readFileSync(this.libPath, "utf8"));
				this.store = JSON.parse(fs.readFileSync(this.strPath, "utf8"));
				if (this.encryptOpt.enable && fs.existsSync(this.encryptOpt.seedPath)) {
					this.encryptOpt.seed = fs.readFileSync(this.encryptOpt.seedPath, "utf8");
					this.decrypt();
				}
				if (this.store.length != Object.keys(this.library).length) throw new Error("Store & Library Size Mismatch, Please manually repair!");
			}

			process.addListener("beforeExit", () => {
				if (this.encryptOpt.enable) this.encrypt();
				fs.writeFileSync(this.encryptOpt.seedPath, `${this.encryptOpt.seed}`);
				this.saveState();
			});
		}
	}

	/**
 		* Writes data to the datastore
 		* @param {String} data Text to write to the datastore
 		* @param {String} key Key you want to store the data under
		* @returns {void}
 	*/
	write(data, key) {
		if (this.library[key]) throw new Error("Key already exists");
		try {
			this.store.push(data);
			this.library[key] = this.store.length - 1;
			this.store[this.library[key]] = this.encode(this.store[this.library[key]]);
		} catch {
			throw new Error("Failed to write to datastore");
		}
	}

	/**
 		* Writes data to the datastore & overwrites existing data under the same key
 		* @param {String} data Text to write to the datastore
 		* @param {String} key Key you want to store the data under (MUST ALREADY EXIST)
		* @returns {void}
 	*/
	overwrite(data, key) {
		try {
			this.delete(key);
		} catch {
			throw new Error("Key does not already exist");
		}
		this.write(data, key);
	}

	/**
 		* Retrieves data from the datastore
 		* @param {String} key Key you want to store the data under (MUST ALREADY EXIST)
		* @returns {String} Data stored under the key
 	*/
	get(key) {
		if (this.store[this.library[key]] == undefined) throw new Error("Key does not exist");
		return this.decode(this.store[this.library[key]]);
	}

	/**
 		* Deletes an entry in the datastore
 		* @param {String} key Key you want to delete
		* @returns {Boolean}
 	*/
	delete(key) {
		if(this.library[key] == undefined) throw new Error("Trying to delete non-existent key");
		this.store.splice(this.store.indexOf(this.library[key]), 1);
		delete this.library[key];
		try {
			if (this.get(key)) throw new Error("Failed to delete key");
		} catch {
			return true;
		}
	}

	/**
 		* Check if datastore is has a entry for the given key
 		* @param {String} key String to check for
		* @returns {Boolean} Returns true if the key exists or false if not.
	*/
	has(key) {
		return this.library[key] != undefined;
	}

	/**
 		* Encodes a string into an array of numbers
 		* @param {String} entry String to encode
		* @returns {Array} Array of numbers
 	*/
	encode(entry) {
		return entry.split("").map((char) => char.charCodeAt(0));
	}

	/**
 		* Decodes a array of numbers into a string
 		* @param {Array} entry Key you want to delete
		* @returns {String} Array de-encoded
 	*/
	decode(array) {
		return array.map((num) => String.fromCharCode(num)).join("");
	}

	/**
 		* "Encrypts" entire live datastore
 	*/
	encrypt() {
		this.encryptOpt.seed = Math.fround(Math.random() * 100000);
		this.store = this.store.map(entry => {
			return entry.map((num) => num * this.encryptOpt.seed);
		});
	}

	/**
 		* "De-encrypts" entire live datastore
 	*/
	decrypt() {
		this.store = this.store.map((entry) => {
			return entry.map((num) => num / this.encryptOpt.seed);
		});
	}

	/**
 		* "Encrypts" entire live datastore
		* @returns {Array} Containing the library & store
 	*/
	exportState() {
		this.decrypt();
		let x = this.library;
		let y = this.store;
		this.encrypt();
		return [x, y];
	}

	/**
 		* Hot-wipes the datastore
 	*/
	purgeState() {
		this.store = [];
		this.library = {};
	}

	/**
 		* Saves the datastore to disk
 	*/
	saveState() {
		fs.writeFileSync(this.strPath, JSON.stringify(this.store));
		fs.writeFileSync(this.libPath, JSON.stringify(this.library));
	}
}

module.exports = Katana;
