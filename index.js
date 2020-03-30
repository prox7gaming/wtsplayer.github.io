/*
 The MIT License

 Copyright (c) 2016 Leonid Fenko aka Fen-ok <fenok2112@gmail.com>, Georgy Kosturov aka Geosins <geosins@yandex.ru>
 */

var server = require( "./server" );
var uuid   = require( 'node-uuid' );

var rooms = {}; // roomID : peerID list
var peers = {}; // peerID : roomID
var passwords = {}; // roomID : password

var responses = Object.freeze( {
	JOINED         : 0,
	CREATED        : 1,
	JOINED_BEFORE  : 2,
	WRONG_PASSWORD : 3,
	PUBLIC_ROOM    : 4,
	PRIVATE_ROOM   : 5,
	NO_ROOM        : 6,
	NO_SUCH_PEER   : 7,
	LEAVED         : 8,
	LEAVED_BEFORE  : 9
} );

server.on( 'peerConnection', function( id )
{
	console.log( 'connection: ' + id );
} );
server.on( 'peerDisconnect', function( id )
{
	console.log( 'disconnect: ' + id );
	onPeerLeaved( id );
} );

function onPeerLeaved( id )
{
	if ( id in peers )
	{
		var roomID = peers[ id ];
		var array  = rooms[ roomID ];
		array.splice( array.indexOf( id ), 1 );
		if ( array.length == 0 )
		{
			delete rooms[ roomID ];
			delete passwords[ roomID ];
			console.log( 'room ' + roomID + ' deleted' );
		}
		delete peers[ id ];
	}
}

server.on( 'getYoutubeVideoInfo', function( req, res )
{
	var http = require( 'http' );

	var options = {
		host : 'www.youtube.com',
		path : '/get_video_info?video_id=' + encodeURIComponent( req.query.ID )
	};

	var callback = function( response )
	{
		var info = '';

		response.on( 'data', function( chunk )
		{
			info += chunk;
		} );

		response.on( 'end', function()
		{
			console.log( 'Got youtube video info' );
			res.json( info );
			//TODO: fail response
		} );
	};

	http.request( options, callback ).end();
} );

server.on( 'getRoomStatus', function( req, res )
{
	if ( passwords[ req.query.roomID ] === undefined )
	{
		console.log( 'getRoomStatus -- NO_ROOM' );
		res.json( responses.NO_ROOM );
	}
	else if ( passwords[ req.query.roomID ] === '' )
	{
		console.log( 'getRoomStatus -- PUBLIC_ROOM' );
		res.json( responses.PUBLIC_ROOM );
	}
	else
	{
		console.log( 'getRoomStatus -- PRIVATE_ROOM' );
		res.json( responses.PRIVATE_ROOM );
	}
} );

server.on( 'getRoomID', function( req, res )
{
	console.log( 'getRoomID' );
	res.json( getRandomRoomID() );
} );

server.on( 'getPeers', function( req, res )
{
	var roomID   = req.query.roomID;
	var password = req.query.password;
	if ( roomID in rooms && passwords[ roomID ] === password )
	{
		console.log( 'getPeers' );
		res.json( rooms[ roomID ] );
	}
	else
	{
		console.log( 'getPeers: denied' );
		res.json( null );
	}
} );

server.on( 'leaveRoom', function( req, res )
{
	console.log( 'leaveRoom' );
	var peerID   = req.query.peerID;
	var roomID   = req.query.roomID;
	var password = req.query.password;
	if ( peerID in this.peerServer._clients[ 'peerjs' ] )
	//this PeerID is registered internally
	//bad style but whatever
	{
		if ( roomID in rooms ) //room exists, join
		{
			if ( passwords[ roomID ] === password ) //can join
			{
				if ( peerID in peers )
				{
					onPeerLeaved( peerID );
					res.json( { type : responses.LEAVED } );
					console.log( 'leaved' );
				}
				else
				{
					res.json( { type : responses.LEAVED_BEFORE } );
					console.log( 'leavedBefore' );
				}
			}
			else //go fuck yourself
			{
				res.json( { type : responses.WRONG_PASSWORD } );
				console.log( 'wrongPassword' );
			}
		}
		else
		{
			res.json( { type : responses.NO_ROOM } );
			console.log( 'no room' );
		}
	}
	else
	{
		res.json( { type : responses.NO_SUCH_PEER } );
		console.log( 'No such peer' );
	}
} );

server.on( 'joinRoom', function( req, res )
{
	var peerID   = req.query.peerID;
	var roomID   = req.query.roomID;
	var password = req.query.password;
	if ( peerID in this.peerServer._clients[ 'peerjs' ] )
	//this PeerID is registered internally
	//bad style but whatever
	{
		if ( roomID in rooms ) //room exists, join
		{
			if ( passwords[ roomID ] === password ) //can join
			{
				if ( peerID in peers )
				{
					res.json( { type : responses.JOINED_BEFORE } );
					console.log( 'joinedBefore' );
				}
				else
				{
					res.json( { type : responses.JOINED, peers : rooms[ roomID ] } ); // return all current peers and add new peer

					peers[ peerID ] = roomID;
					rooms[ roomID ].push( peerID );
					/*rooms[roomID].forEach(function(item, i, arr)
					 {
					 console.log( i + ": " + item + " (массив:" + arr + ")" );
					 });*/

					console.log( 'joined' );
				}
			}
			else //go fuck yourself
			{
				res.json( { type : responses.WRONG_PASSWORD } );
				console.log( 'wrongPassword' );
			}
		}
		else //create room
		{
			peers[ peerID ]     = roomID;
			rooms[ roomID ]     = [ peerID ];
			passwords[ roomID ] = req.query.password;
			res.json( { type : responses.CREATED } );
			console.log( 'created' );
		}
	}
	else
	{
		res.json( { type : responses.NO_SUCH_PEER } );
		console.log( 'No such peer' );
	}
} );

function getRandomRoomID()
{
	return uuid.v1();
}