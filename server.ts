require("rootpath")();
﻿import express              = require("express");
import http                 = require("http");
import path                 = require("path");
//import offlineSearch        = require("cs-offline-search");
import cc                   = require("ServerComponents/dynamic/ClientConnection");
import creator              = require("ServerComponents/creator/MapLayerFactory");
import DataSource           = require("ServerComponents/dynamic/DataSource");
import MessageBus           = require("ServerComponents/bus/MessageBus");
import BagDatabase          = require("ServerComponents/database/BagDatabase");
import ConfigurationService = require("ServerComponents/configuration/ConfigurationService");
import DynamicProject       = require("ServerComponents/dynamic/DynamicProject");

// setup socket.io object
var favicon    = require("serve-favicon");
var bodyParser = require("body-parser");
var server     = express();

var httpServer = require("http").Server(server);
var cm         = new cc.ConnectionManager(httpServer);
var messageBus = new MessageBus.MessageBusService();
var config     = new ConfigurationService("./configuration.json");
var proxy      = require('express-http-proxy');


// all environments
var port = "3002";
server.set("port", port);
server.use(favicon(__dirname + "/public/favicon.ico"));
server.use(bodyParser.json()); // support json encoded bodies
server.use(bodyParser.urlencoded({ extended: true })); // support encoded bodies

// Work around cross site scripting
// Proxy calls from localhost/couchdb -to-> localhost:3002/couchdb
server.use('/couchdb', proxy('localhost', {
    forwardPath: function(req, res) {
        return '/couchdb' + require('url').parse(req.url).path;
    }
}));
// Proxy calls from localhost/explore -to-> localhost:3002/explore
server.use('/explore', proxy('localhost', {
    forwardPath: function(req, res) {
        return '/explore' + require('url').parse(req.url).path;
    }
}));

config.add("server", "http://localhost:" + port);

var pr = new DynamicProject.DynamicProjectService(server,cm,messageBus);
pr.Start(server);

var ds = new DataSource.DataSourceService(cm, "DataSource");
ds.start();
server.get("/datasource", ds.getDataSource);

var bagDatabase = new BagDatabase(config);
var mapLayerFactory = new creator.MapLayerFactory(bagDatabase, messageBus);
server.post("/projecttemplate", (req, res) => mapLayerFactory.process(req, res));

server.use(express.static(path.join(__dirname, "public")));
console.log("started");

httpServer.listen(server.get("port"),() => {
    console.log("Express server listening on port " + server.get("port"));
});
