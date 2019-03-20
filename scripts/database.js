var mssql = require("mssql");

function ExecSQLQuery(sqlQuery, callback){
    const pool = new mssql.ConnectionPool(config);
    var conn = pool;
    
    conn.connect().then(function (err){
        var request = new mssql.Request(conn);
        request.query(sqlQuery, function (err, recordsets){
            if(err){
                console.log("Database error: " + err);
                conn.close();
            }
            if (callback){
                callback(recordsets);
            }
            conn.close();
        });
    });
}