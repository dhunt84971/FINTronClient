function appDatabase(config) {
    // This object expects a config object of the format:
    /*
    var config = {
        user: "",
        password: "",
        server: "",
        database: "",
        requestTimeout: 120000,
        fin: ""
    }
    */
    var mssql = require("mssql");
    const connTimeout = 5000;

    //#region BASE DB FUNCTIONS
    function connect() {
        return new Promise((resolve, reject) => {
            let locConfig = config;
            locConfig.connectionTimeout = 100;
            let options = {encrypt: false, useUTC: false};
            locConfig.options = options;
            console.log(locConfig);
            const pool = new mssql.ConnectionPool(locConfig);
            pool
                .connect()
                .then(pool => {
                    console.log("connected");
                    resolve(pool);
                })
                .catch(err => {
                    console.log(err);
                    reject(err);
                });
        });
    }

    function execSQLQuery(sqlQuery, callback) {
        return new Promise(async (resolve, reject) => {
            let locConfig = config;
            locConfig.connectionTimeout = connTimeout; // Override default 15 second timeout.
            let options = {encrypt: false, useUTC: false};
            locConfig.options = options;
            const conn = new mssql.ConnectionPool(locConfig);
            console.log(locConfig);
            console.log("DB Query = " + sqlQuery);
            let retryCount = 0;
            while (retryCount < 3){  // Max db connect retries hardcoded to 3.
                console.log("retryCount = " + retryCount);
                console.log(conn);

                await conn.connect()
                    .then(function () {
                        retryCount = 99;
                        var request = new mssql.Request(conn);
                        request.query(sqlQuery, (err, recordsets) => {
                            if (err) {
                                console.log("Database error: " + err);
                                if (callback){
                                    callback(err);
                                }
                                else{
                                    reject(err);
                                }
                            }
                            conn.close();
                            if (callback) {
                                callback(err, recordsets);
                            }
                            resolve(recordsets);
                            return recordsets;
                        });
                    })
                    .catch(function (err) {
                        console.log(err);
                        if (err) {
                            retryCount += 1;
                            console.log("DB Retrying Query = " + sqlQuery);
                            if (retryCount < 3){
                                conn.close();
                            }
                            else{
                                conn.close();
                                if (callback){
                                    callback(err);
                                }
                                else{
                                    reject(err);
                                }
                                return;
                            }
                        }
                    });
            }
        });

    }
    

    function verifySQLConnection(callback) {
        execSQLQuery("SELECT getdate()", (err, recordsets) => {
            if (err) {
                if (callback) {
                    callback(false, err);
                }
                return false;
            } else {
                if (callback) {
                    callback(true, null);
                }
                return true;
            }
        });
    }

    function getNow(callback) {
        return new Promise((resolve, reject) => {
            console.log("getting now");
            try {
                var sqlQuery = `
                    SELECT FORMAT(getdate(), 'MM/dd/yyyy HH:mm:ss') AS Now
                    `;
                execSQLQuery(sqlQuery, (err, recordsets) => {
                    console.log(err);
                    if (callback) {
                        callback(err, recordsets);
                    }
                    resolve(recordsets);
                    return recordsets;
                });
            } catch (err) {
                console.log(err);
                reject(err);
                return err;
            }
        });
    }

    function getSQLSingleRec(sqlQuery, callback) {
        console.log("Executing SQL Query: " + sqlQuery);
        return new Promise(function (resolve, reject) {
            try {
                execSQLQuery(sqlQuery, (err, recordsets) => {
                    if (!err) {
                        resolve(recordsets.recordset[0]);
                        if (callback) {
                            console.log(recordsets.recordset[0]);
                            callback(err, recordsets.recordset[0]);
                        }
                        return recordsets.recordset[0];
                    } else {
                        reject(err);
                        console.log(err);
                        callback(err, null);
                    }
                });
            } catch (err) {
                reject(err);
                console.log(err);
                callback(err, null);
            }
        });
    }

    function getSQLRecs(sqlQuery, callback) {
        console.log("Executing SQL Query: " + sqlQuery);
        return new Promise(function (resolve, reject) {
            try {
                execSQLQuery(sqlQuery, (err, recordsets) => {
                    if (!err) {
                        resolve(recordsets.recordset);
                        if (callback) {
                            console.log(recordsets.recordset);
                            callback(err, recordsets.recordset);
                        }
                        return recordsets.recordset;
                    } else {
                        reject(err);
                        console.log(err);
                        callback(err, null);
                    }
                });
            } catch (err) {
                reject(err);
                console.log(err);
                callback(err, null);
            }
        });
    }

    function execSQLCommand(sqlCommand, callback) {
        return new Promise(function (resolve, reject) {
            try {
                execSQLQuery(sqlCommand, (err) => {
                    if (err) {
                        reject(err);
                        if (callback) {
                            callback(err);
                        }
                        return err;
                    } else {
                        resolve();
                        if (callback) {
                            callback();
                        }
                        return;
                    }
                });
            } catch (err) {
                reject(err);
                if (callback) {
                    callback(err);
                }
                return err;
            }
        });
    }

    //#endregion BASE DB FUNCTIONS

    //#region FIN DB FUNCTIONS
    function getLive(tagNames, startTime, endTime, interval, callback) {
        console.log("getting pen data for ");
        try {

            var tags = "";
            console.log("tagNames = " + tagNames);
            tagNames.forEach(tag => {
                tags += tag + ",";
            });
            tags = tags.substring(0, tags.length - 1);

            var sqlQuery = `
                SELECT convert(varchar(10), DateTime, 101) + ' ' + 
                convert(varchar(8), DateTime, 108) AS time, ` +
                tags +
                `
                FROM OPENQUERY(` + config.fin + `, '
                SELECT DateTime, ` + tags + `
                FROM Live')
                `;
            console.log(sqlQuery);
            execSQLQuery(sqlQuery, (err, recordsets) => {
                if (callback) {
                    callback(err, recordsets);
                }
            });

        } catch (err) {
            console.log(err);
        }
    };

    function getHistory(tagNames, startTime, endTime, interval, callback) {
        console.log("getting pen data for ");
        try {

            var tags = "";
            console.log("tagNames = " + tagNames);
            tagNames.forEach(tag => {
                tags += tag + ",";
            });
            tags = tags.substring(0, tags.length - 1);

            var sqlQuery = `
                SELECT convert(varchar(10), DateTime, 101) + ' ' + 
                convert(varchar(8), DateTime, 108) AS time, ` +
                tags +
                `
                FROM OPENQUERY(` + config.fin + `, '
                SELECT DateTime, ` + tags + `
                FROM HISTORY 
                WHERE DateTime >= ''` + startTime + `'' AND DateTime < ''` + endTime + `'' AND _options=''interval=` + interval + `'' 
                ')
                `;
            console.log(sqlQuery);
            execSQLQuery(sqlQuery, (err, recordsets) => {
                if (callback) {
                    callback(err, recordsets);
                }
            });

        } catch (err) {
            console.log(err);
        }
    }

    function getLocations(callback) {
        console.log("getting locations");
        try {
            var sqlQuery = `
                SELECT Distinct(Location) As Location 
                FROM OPENQUERY(` + config.fin + `, '
                SELECT Location 
                FROM DataPoints 
                ') ORDER BY Location ASC
                `;
            execSQLQuery(sqlQuery, (err, recordsets) => {
                console.log(err);
                if (callback) {
                    callback(err, recordsets);
                }
            });
        } catch (err) {
            console.log(err);
        }
    };

    function getTags(callback) {
        console.log("getting tags");
        try {
            var sqlQuery = `
                SELECT Name, Location, Description, Type, Units
                FROM OPENQUERY(` + config.fin + `, '
                SELECT Name, Location, Description, Type, Units
                FROM DataPoints 
                ')
                `;
            execSQLQuery(sqlQuery, (err, recordsets) => {
                if (callback) {
                    callback(err, recordsets);
                }
            });
        } catch (err) {
            console.log(err);
        }
    };

    function getTagsbyLocation(location, callback) {
        console.log("getting tags at " + location);
        try {
            var sqlQuery = `
                SELECT Name 
                FROM OPENQUERY(` + config.fin + `, '
                SELECT Name 
                FROM DataPoints 
                WHERE Location=''` + location + `''
                ')
                `;
            execSQLQuery(sqlQuery, (err, recordsets) => {
                if (callback) {
                    callback(err, recordsets);
                }
            });
        } catch (err) {
            console.log(err);
        }
    };

    function getTagDescription(tag, callback) {
        console.log("Calling GetTagDescription(" + tag + ")");
        try {
            var sqlQuery = `
                SELECT Description, Units
                FROM OPENQUERY(` + config.fin + `, '
                SELECT Description, Units
                FROM DataPoints 
                WHERE Name = ''` + tag + `''
                ')
                `;
            execSQLQuery(sqlQuery, (err, recordsets) => {
                if (callback) {
                    callback(err, recordsets.recordset[0]);
                }
                return recordsets.recordset[0].Description;
            });
        } catch (err) {
            console.log(err);
        }
    }

    function getTag(tag, callback) {
        return new Promise((resolve, reject) => {
            console.log("Calling getTag(" + tag + ")");
            try {
                var sqlQuery = `
                    SELECT Name, Location, Description, Type, Units
                    FROM OPENQUERY(` + config.fin + `, '
                    SELECT Name, Location, Description, Type, Units
                    FROM DataPoints 
                    WHERE Name = ''` + tag + `''
                    ')
                    `;
                execSQLQuery(sqlQuery, (err, recordsets) => {
                    if (callback) {
                        callback(err, recordsets.recordset[0]);
                    }
                    if (!err){
                        resolve(recordsets.recordset[0]);
                    }
                    else {
                        console.log(err);
                        reject(err);
                        return err;
                    }     
                    return recordsets.recordset[0];
                });
            } catch (err) {
                console.log(err);
                reject(err);
                return err;
            }
        });
    }

    //#endregion FIN DB FUNCTIONS

    // Expose functions for external use.
    this.connect = connect;
    this.verifySQLConnection = verifySQLConnection;
    this.execSQLQuery = execSQLQuery;
    this.execSQLCommand = execSQLCommand;
    this.getSQLSingleRec = getSQLSingleRec;
    this.getSQLRecs = getSQLRecs;
    this.getHistory = getHistory;
    this.getNow = getNow;
    this.getLive = getLive;
    this.getTags = getTags;
    this.getTag = getTag;
    this.getLocations = getLocations;
    this.getTagDescription = getTagDescription;
    this.getTagsbyLocation = getTagsbyLocation;
}