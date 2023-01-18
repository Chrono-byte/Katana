/*
	Copyright (c) 2022 Michael Gummere
	All rights reserved.
	Redistribution and use in source and binary forms governed under the terms of the zlib/libpng License with Acknowledgement license.
*/

const fs = require("fs");
const path = require("path");

function initSaving() {
	this.library = JSON.parse(fs.readFileSync(this.libPath, "utf8"));
	this.store = JSON.parse(fs.readFileSync(this.strPath, "utf8"));
	if (this.encryptOpt.enable && fs.existsSync(this.encryptOpt.seedPath)) {
		this.encryptOpt.seed = fs.readFileSync(this.encryptOpt.seedPath, "utf8");
		this.decrypt();
	}
	if (this.store.length != Object.keys(this.library).length) throw new Error("Store & Library Size Mismatch, Please manually repair!");
}

/**
	* Katana Datastore
	* @param {String} dbPath Relative path to the datastore folder
	* @param {Object} options Object containing options for the datastore
	* @ignore
*/
class Katana {
	constructor(dsPath, options) {
		this.strPath = path.join(dsPath, "store.json");
		this.libPath = path.join(dsPath, "library.json");
		this.encryptOpt = {
			enable: options.encrypt
		};
		if (this.encryptOpt.enable) {
			this.encryptOpt.seedPath = path.join(dsPath, "seed.txt")
			this.encryptOpt.seed = 0;
		}

		this.store = [];
		this.library = {};

		if (options.saveToDisk) {
			if(!fs.existsSync(dsPath)) fs.mkdirSync(dsPath);
			if (fs.existsSync(this.strPath) && fs.existsSync(this.libPath)) {
				initSaving();
			} else {
				fs.mkdirSync(this.strPath);
				fs.mkdirSync(this.libPath);
				initSaving();
			}

			process.addListener("beforeExit", () => {
				if (this.encryptOpt.enable) {
					this.encrypt();
					fs.writeFileSync(this.encryptOpt.seedPath, `${this.encryptOpt.seed}`);
				}
				this.saveState();
			});
		}
	}

	/**
			* Writes data to the datastore
			* @param {String} data Text to write to the datastore
			* @param {String} key Key you want to store the data under
			* @ignore
		* @returns {Boolean} Returns true if the key if the write was successful or false if not.
	  */
	write(data, key) {
		if (this.library[key]) throw new Error("Key already exists");
		try {
			this.store.push(data);
			this.library[key] = this.store.length - 1;
			this.store[this.library[key]] = this.encode(this.store[this.library[key]]);
		} catch {
			return false;
		}
		return true;
	}

	/**
			* Writes data to the datastore & overwrites existing data under the same key.
			* @param {String} data Text to write to the datastore
			* @param {String} key Key you want to store the data under (MUST ALREADY EXIST)
			* @ignore
		* @returns {void} Returns true if the key if the write was successful or false if not.
	  */
	overwrite(data, key) {
		try {
			this.delete(key);
		} catch {
			return false;
		}
		return this.write(data, key);
	}

	/**
			* Retrieves data from the datastore
			* @param {String} key Key you want to store the data under (MUST ALREADY EXIST)
			* @ignore
		* @returns {String} Data stored under the key
	  */
	get(key) {
		if (this.store[this.library[key]] == undefined) throw new Error("Key does not exist");
		return this.decode(this.store[this.library[key]]);
	}

	/**
			* Deletes an entry in the datastore
			* @param {String} key Key you want to delete
			* @ignore
		* @returns {Boolean} Returns true if the delete was successful or false if not.
	  */
	delete(key) {
		if (this.library[key] == undefined) throw new Error("Trying to delete non-existent key");
		this.store.splice(this.store.indexOf(this.library[key]), 1);
		delete this.library[key];
		if (this.has(key)) {
			return false;
		} else return true;
	}

	/**
			* Check if datastore is has a entry for the given key
			* @param {String} key String to check for
			* @ignore
		* @returns {Boolean} Returns true if the key exists or false if not.
	*/
	has(key) {
		return this.library[key] != undefined;
	}

	/**
			* Encodes a string into an array of numbers
			* @param {String} entry String to encode
			* @ignore
		* @returns {Array} Array of numbers
	  */
	encode(entry) {
		return entry.split("").map((char) => char.charCodeAt(0));
	}

	/**
			* de-encodes a array of numbers into a string
			* @param {Array} entry Key you want to delete
			* @ignore
		* @returns {String} Array de-encoded
	  */
	decode(array) {
		return array.map((num) => String.fromCharCode(num)).join("");
	}

	/**
			* "Encrypts" entire live datastore
			* @ignore
	  */
	encrypt() {
		this.encryptOpt.seed = Math.fround(Math.random() * 100000);
		this.store = this.store.map(entry => {
			return entry.map((num) => num * this.encryptOpt.seed);
		});
	}

	/**
			* "De-encrypts" entire live datastore
			* @ignore
	  */
	decrypt() {
		this.store = this.store.map((entry) => {
			return entry.map((num) => num / this.encryptOpt.seed);
		});
	}

	/**
			* "Encrypts" entire live datastore
			* @ignore
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
			* @ignore
	  */
	purgeState() {
		this.store = [];
		this.library = {};
	}

	/**
			* Saves the datastore to disk
			* @ignore
	  */
	saveState() {
		fs.writeFileSync(this.strPath, JSON.stringify(this.store));
		fs.writeFileSync(this.libPath, JSON.stringify(this.library));
	}
}

module.exports = Katana;