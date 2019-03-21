/* This script file depends on:
    database.js
    settings.js
*/


// This script file depends on the existence of a config object of the format:
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

function GetPenData(tagNames, startTime, endTime, interval, callback){
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
        ExecSQLQuery(sqlQuery, (err, recordsets) =>{
            if (callback){
                callback(err, recordsets);
            }
        });
        
    } catch (err) {
        console.log(err);
    }
};

function GetLocations(callback){
    console.log("getting locations");
    try {
        var sqlQuery = `
            SELECT Distinct(Location) As Location 
            FROM OPENQUERY(` + config.fin + `, '
            SELECT Location 
            FROM DataPoints 
            ') ORDER BY Location ASC
            `;
        ExecSQLQuery(sqlQuery, (err, recordsets) =>{
            console.log(err);
            if (callback){
                callback(err, recordsets);
            }
        });
    } catch (err) {
        console.log(err);
    }
};

function GetTags(callback){
    console.log("getting tags");
    try {
        var sqlQuery = `
            SELECT Name 
            FROM OPENQUERY(` + config.fin + `, '
            SELECT Name 
            FROM DataPoints 
            ')
            `;
        ExecSQLQuery(sqlQuery, (err, recordsets) =>{
            if (callback){
                callback(err, recordsets);
            }
        });
    } catch (err) {
        console.log(err);
    }
};

function GetTagsbyLocation(location, callback){
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
        ExecSQLQuery(sqlQuery, (err, recordsets) =>{
            if (callback){
                callback(err, recordsets);
            }
        });
    } catch (err) {
        console.log(err);
    }
};

function GetTagDescription(tag, callback){
    console.log("Calling GetTagDescription("+ tag +")");
    try {
        var sqlQuery = `
            SELECT Description, Units
            FROM OPENQUERY(` + config.fin + `, '
            SELECT Description, Units
            FROM DataPoints 
            WHERE Name = ''` + tag + `''
            ')
            `;
        ExecSQLQuery(sqlQuery, (err, recordsets) =>{
            if (callback){
                callback(err, recordsets);
            }
            return recordsets.recordset[0].Description;
        });
    } catch (err) {
        console.log(err);
    }
}