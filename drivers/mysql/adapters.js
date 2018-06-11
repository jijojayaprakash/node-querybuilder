// Load MySQL Driver
const mysql = require('mysql');

class Adapter {
    constructor(nqb) {
        // Verify that an instance of Node QueryBuilder was passed in
        if (!nqb || typeof nqb !== 'object') {
            throw new Error("No/Invalid QueryBuilder super object instance supplied.");
        }

        // Store QB super object as class prop
        this.nqb = Object.assign({}, nqb);

        // Verify setting property exists
        if (!this.nqb.hasOwnProperty('settings')) {
            throw new Error("No connection settings provided to initialize QueryBuilder!");
        }

        // Enable debugging if necessary
        this.debugging = false;
        if (this.nqb.settings.hasOwnProperty('qb_debug') && this.nqb.settings.qb_debug === true) {
            this.debugging = true;
            delete this.nqb.settings.qb_debug;
        }

        // Verify that required fields are provided...
        if (Object.keys(this.nqb.settings).length === 0) throw new Error("No connection information provided!");
        if (!this.nqb.settings.hasOwnProperty('host')) this.nqb.settings.host = 'localhost';
        if (!this.nqb.settings.hasOwnProperty('user')) throw new Error("No user property provided. Hint: It can be NULL");
        //if (!this.nqb.settings.hasOwnProperty('password')) throw new Error("No connection password provided. Hint: It can be NULL");

        this.map_connection_settings();
    }

    // ****************************************************************************
    // Map generic NQB connection settings to node-mysql's format
    // ----
    // NOTE: MySQL connection settings names are the same as Node Querybuilder,
    // it's just good practice to go ahead and do this in case things change.
    // ****************************************************************************
    map_connection_settings() {
        const nqb_settings = JSON.parse(JSON.stringify(this.nqb.settings));

        this.connection_settings = {
            host: nqb_settings.host,
            user: nqb_settings.user,
            password: nqb_settings.password,
        };

        if (nqb_settings.hasOwnProperty('database')) {
            this.connection_settings.database = nqb_settings.database;
            delete nqb_settings.database;
        }
        if (nqb_settings.hasOwnProperty('port')) {
            this.connection_settings.port = nqb_settings.port;
            delete nqb_settings.port;
        }

        // Remove mapped settings:
        delete nqb_settings.host;
        delete nqb_settings.user;
        delete nqb_settings.password;

        // Merge any driver-specific settings into connection settings
        this.connection_settings = Object.assign(this.connection_settings, nqb_settings);
    }

    // ****************************************************************************
    // Try to load the driver's query builder library and modify QueryBuilder object
    // -----
    // @param   Object  qb    The QueryBuilder object
    // @return  Object        QueryBuilder object
    // ****************************************************************************
    get_query_builder() {
        try {
            return require('./query_builder.js').QueryBuilder();
        } catch(e) {
            throw new Error("Couldn't load the QueryBuilder library for " + this.nqb.driver + ": " + e);
        }
    }

    // ****************************************************************************
    // Get the the driver's QueryExec object so that queries can actually be
    // executed by this library.
    // -----
    // @param   Object  qb      The QueryBuilder object
    // @param   Object  conn    The Connnection object
    // @return  Object          QueryExec Object
    // ****************************************************************************
    get_query_exec(qb, conn) {
        try {
            return require('./query_exec.js').QueryExec(qb, conn);
        } catch(e) {
            throw new Error("Couldn't load the QueryExec library for " + this.nqb.driver + ": " + e);
        }
    }
}


// -----------------------------------------------------------------------------------------------------------------------------


class Single extends Adapter {
    constructor(nqb, settings) {
        super(nqb);

        // Set defaults
        this.pool = null;
        this._connection = null;

        // If the Pool object is instatiating this Adapter, use it's connection
        if (settings && settings.pool) {
            this.pool = settings.pool.pool;
            this._connection = settings.pool.connection;
        }
        // Otherwise, let's create a new connection
        else {
            this._connection = new mysql.createConnection(this.connection_settings);
        }

        if (!this._connection) throw new Error("No connection could be established!");

        this.qb = this.get_query_builder();
        this.qe = this.get_query_exec(this.qb, this._connection);

        const self = this;

        return Object.assign({
            connection_settings: function() {
                return self.connection_settings;
            },

            connect: function(callback) {
                return self._connection.connect(callback);
            },

            connection: function() {
                return self._connection;
            },

            escape: function(str) {
                return self._connection.escape(str);
            },

            escape_id: function(str) {
                return self._connection.escapeId(str);
            },

            disconnect: function(callback) {
                return self._connection.end(callback);
            },

            release: function() {
                if (!self.pool) throw new Error("You cannot release a non-pooled connection from a connection pool!");
                self.pool.releaseConnection(self._connection);
            }
        }, this.qb, this.qe);
    }
}


// -----------------------------------------------------------------------------------------------------------------------------


class Pool extends Adapter {
    constructor(nqb) {
        super(nqb);

        // Create pool for node-querybuild object if it doesn't already have one.
        if (!this.nqb.hasOwnProperty('pool') || this.nqb.pool.length === 0) {
            // Create connection Pool
            this.nqb.pool = mysql.createPool(this.connection_settings);

            // Test connection pool (asynchronous -- this shouldn't prevent the pool from initially loading)
            if (this.debugging === true) {
                this.nqb.pool.getConnection((err, connection) => {
                    connection.query('SELECT 1 + 1 AS solution', (err) => {
                        connection.release();
                        if (err) {
                            console.error(err);
                        } else {
                            console.log('mysql connection pool created');
                        }
                    });
                });
            }
        }

        const self = this;

        return {
            pool: function() {
                return self.nqb.pool;
            },
            get_connection: function(callback) {
                if (null === self.nqb.pool) {
                    const error_msg = "Connection pool not available!";
                    if (console && console.hasOwnProperty('error')) console.error(error_msg);
                    throw new Error(error_msg);
                }

                self.nqb.pool.getConnection((err, connection) => {
                    if (err) throw err;
                    const adapter = new Single(self.nqb, {
                        pool: {
                            pool: self.nqb.pool,
                            connection: connection
                        }
                    });

                    callback(adapter);
                });
            },
            disconnect: function(callback) {
                self.nqb.pool.end(callback);
            }
        }
    }
}


// -----------------------------------------------------------------------------------------------------------------------------


class Cluster extends Adapter {
    constructor(nqb) {
        super(nqb);
        return {};
    }
}

exports.Adapters = {Single,Pool,Cluster};
