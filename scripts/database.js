var mssql = require("mssql");

function execSQLQuery(sqlQuery, callback){
    const pool = new mssql.ConnectionPool(config);
    var conn = pool;
    
    conn.connect()
        .then(function (){
            var request = new mssql.Request(conn);
            request.query(sqlQuery, function (err, recordsets){
                if(err){
                    console.log("Database error: " + err);
                    conn.close();
                }
                if (callback){
                    callback(err, recordsets);
                }
                conn.close();
            });
        })
        .catch(function (err){
            if (err){
                callback(err);
                return;
            }
        });

}

function verifySQLConnection(callback){
    execSQLQuery("SELECT getdate()", (err, recordsets)=>{
        if (err){
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