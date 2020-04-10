var mssql = require("mssql");
const connTimeout = 5000;

function execSQLQuery(sqlQuery, callback) {
    return new Promise(async (resolve, reject) => {
        let locConfig = config;
        locConfig.connectionTimeout = connTimeout; // Override default 15 second timeout.
        const pool = new mssql.ConnectionPool(locConfig);
        console.log(locConfig);
        console.log(sqlQuery);
        var conn = pool;
        let retryCount = 0;
        while (retryCount < 3){  // Max db connect retries hardcoded to 3.
            console.log("retryCount = " + retryCount);
            await conn.connect()
                .then(function () {
                    retryCount = 99;
                    var request = new mssql.Request(conn);
                    request.query(sqlQuery, (err, recordsets) => {
                        if (err) {
                            console.log("Database error: " + err);
                            reject(err);
                        }
                        if (callback) {
                            callback(err, recordsets);
                        }
                        conn.close();
                        resolve(recordsets);
                        return;
                    });
                })
                .catch(function (err) {
                    console.log(err);
                    if (err) {
                        retryCount += 1;
                        if (retryCount < 3){
                            conn.close();
                        }
                        else{
                            conn.close();
                            if (callback){
                                callback(err);
                            }
                            reject(err);
                            return;
                        }
                    }
                });
        }
    });

}

function verifySQLConnection(callback){
    execSQLQuery("SELECT getdate()", (err, recordsets)=>{
        if (err){
            console.log(err);
            if (callback){
                callback(false);
            }
            return false;
        }
        else{
            if (callback){
                callback(true);
            }
            return true;
        }
    });
}

function getNow(callback){
    console.log("getting now");
    try {
        var sqlQuery = `
            SELECT FORMAT(getdate(), 'MM/dd/yyyy HH:mm:ss') AS Now
            `;
        execSQLQuery(sqlQuery, (err, recordsets) =>{
            console.log(err);
            if (callback){
                callback(err, recordsets);
            }
        });
    } catch (err) {
        console.log(err);
    }
}