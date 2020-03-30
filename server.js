/*
 The MIT License

 Copyright (c) 2016 Leonid Fenko aka Fen-ok <fenok2112@gmail.com>, Georgy Kosturov aka Geosins <geosins@yandex.ru>
 */

var events = require( 'events' );
var util   = require( 'util' );

function initServer()
{
	var self = this;
	events.EventEmitter.call( this );
	var server_port       = process.env.OPENSHIFT_NODEJS_PORT || 8000;
	var server_ip_address = process.env.OPENSHIFT_NODEJS_IP || '0.0.0.0';

	var express = require( 'express' );
	var app     = express();

	app.use( express.static( './node_modules/peerjs_fork_firefox40/dist' ) );
	app.use( express.static( './views' ) );
	app.use( express.static( './views/assets/js-custom' ) );
	app.use( express.static( './views/assets/css-custom' ) );
	app.use( express.static( './views/assets/svg-custom' ) );
	app.use( express.static( './views/assets/svg-origin' ) );
	app.use( express.static( './views/assets/ico-custom' ) );

	app.engine( '.html', require( 'ejs' ).renderFile );
	app.enable( 'trust proxy' );

	//console.log(req.hostname);

	app.get( '*', function( req, res, next )
	{
		console.log( 'baseUrl: ' + req.path );
		if ( !req.secure && req.hostname !== 'localhost' )
		{
			res.redirect( 'https://' + req.headers.host + req.url );
		}
		else
		{
			next();
		}
	} );

	/*app.get( /^\/room\/[0-9a-z]{8}-[0-9a-z]{4}-[0-9a-z]{4}-[0-9a-z]{4}-[0-9a-z]{12}$/, function( req, res )
	 {
	 res.render( 'room.html' );
	 } );*/

	app.get( '/testing', function( req, res )
	{
		res.render( 'testing.html' );
	} );

	app.get( '/', function( req, res, next )
	{
		console.log( "/" );
		//res.sendfile('./public/start.html');
		res.render( 'room.html' );
	} );

	app.get( '/getYoutubeVideoInfo', function( req, res )
	{
		self.emit( 'getYoutubeVideoInfo', req, res );
	} );
	app.get( '/getRoomID', function( req, res )
	{
		self.emit( 'getRoomID', req, res );
	} );
	app.get( '/joinRoom', function( req, res )
	{
		self.emit( 'joinRoom', req, res );
	} );
	app.get( '/getRoomStatus', function( req, res )
	{
		self.emit( 'getRoomStatus', req, res );
	} );
	app.get( '/getPeers', function( req, res )
	{
		self.emit( 'getPeers', req, res );
	} );
	app.get( '/leaveRoom', function( req, res )
	{
		self.emit( 'leaveRoom', req, res );
	} );

	var ExpressPeerServer = require( 'peer' ).ExpressPeerServer;
	var server            = require( 'http' ).createServer( app );
	var expresspeerserver = ExpressPeerServer( server, { debug : true } );

	expresspeerserver.on( 'connection', function( id )
	{
		self.emit( 'peerConnection', id );
	} );
	expresspeerserver.on( 'disconnect', function( id )
	{
		self.emit( 'peerDisconnect', id );
	} );

	this.peerServer = expresspeerserver;

	app.use( '/peerjs', expresspeerserver );

	var timesyncServer = require( 'timesync/server' );
	app.use( '/timesync', timesyncServer.requestHandler );

	server.listen( server_port, server_ip_address );
}
util.inherits( initServer, events.EventEmitter );

module.exports = new initServer();