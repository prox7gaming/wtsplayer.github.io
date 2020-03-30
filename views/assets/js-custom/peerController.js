/*
 The MIT License

 Copyright (c) 2016 Leonid Fenko aka Fen-ok <fenok2112@gmail.com>, Georgy Kosturov aka Geosins <geosins@yandex.ru>
 */

var wtsplayer = wtsplayer || {};

wtsplayer.peerController = function()
{
	this.externals =
	{
		stateController    : {
			getStateData  : null,
			onRecieved    : null,
			onPeerDeleted : null,
			onJoinedRoom  : null,
			onLeavedRoom  : null
		},
		elementsController : {
			outputSystemMessage   : null,
			onRecieved            : null,
			getInitialData        : null,
			onPeerDeleted         : null,
			onGotAudioStream      : null,
			onPeerJoinedVoiceChat : null,
			onPeerLeavedVoiceChat : null,
			onPeerConnected       : null
		}
	};

	var __stateController    = this.externals.stateController;
	var __elementsController = this.externals.elementsController;

	var _self = this;

	this.sending = Object.freeze( {
		MESSAGE        : 0,
		WAITING_STATUS : 1,
		STATE          : 2,
		NICK           : 3,
		DATA_SOURCE    : 4,
		DROPPED_CALL   : 5,
		FAKE_CALL      : 6,
		INITIAL_INFO   : 7,
		TIMESYNC_INFO  : 8
	} );

	this.getting = Object.freeze( {
		SELF_ID             : 0,
		OTHER_PEERS_ID      : 1,
		SELF_IS_SUPER_PEER  : 2,
		CONNECTED_TO_SERVER : 3,
		JOINED_ROOM         : 4,
		JOINED_VOICE_CHAT   : 5
	} );

	this.responses = Object.freeze( {
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

	this.callTypes = Object.freeze( {
		INITIAL : 0,
		ANSWER  : 1
	} );

	var _localRoomIDGeneration = true;

	var _serverTimeSync       = true;
	var _reliableDataChannels = false;

	//Timeout after which peers gets refreshed from the server
	var _joinTimeout = 5500; //ms
	//--

	var _connectedToServer;
	var _connectingToServer;
	var _joinedRoom;
	var _joinedVoiceChat;

	var currentRoomID;
	var currentPassword;

	var _ts = _serverTimeSync ?
		timesync.create(
			{
				server   : '/timesync',
				interval : null
			} )
		:
		timesync.create(
			{
				peers    : [],
				interval : null
			} );

	var _peer;

	//We recommend keeping track of connections yourself rather than relying on this [peer.connections] hash.
	//Okay!
	var _dataConnections;
	//--

	var _audioStream;
	var _calls;

	var _activeRequests;

	var _pingingRate = 3000000; //ms -- 50 min
	var _pingingInterval = null;

	function init()
	{
		_connectedToServer  = false;
		_connectingToServer = false;
		_joinedRoom         = false;
		_joinedVoiceChat    = false;

		currentRoomID   = '';
		currentPassword = '';

		_ts.off( 'sync' );
		_ts.off( 'change' );
		_ts.off( 'error' );

		if ( !_serverTimeSync )
		{
			_ts.options.peers = [];
		}

		_dataConnections = {};

		_audioStream = null;
		_calls       = {};

		_activeRequests = [];

		clearInterval( _pingingInterval );
		_pingingInterval = setInterval( function()
		{
			//TODO: change server code so that it doesn't throw error 'Message unrecognized'
			_peer.socket.send( { type : 'ping' } );
		}, _pingingRate );
	}

	/*
	 Connect to peerJS
	 Apply handlers for incoming data and media connections

	 If time is being synced with server, callback is called after connecting to PeerJS and syncing time
	 Otherwise callback is called on connection to PeerJS server
	 */
	//TODO: more paranoidal flags
	this.connectToServer = function( callback, failCallback )
	{
		if ( !_connectedToServer && !_connectingToServer )
		{
			_connectingToServer = true;
			//Creating peer
			//Remember that OpenShift uses 8000 port
			_peer = new Peer( '',
				{
					host   : location.hostname,
					port   : location.protocol === 'https:' ? 8443 : 8000,
					path   : '/peerjs',
					secure : location.protocol === 'https:',
					config : {
						'iceServers' : [
							{ url : 'stun:stun.ekiga.net' },
							{ url : 'stun:stun.ideasip.com' },
							{ url : 'stun:stun.iptel.org' },
							{ url : 'stun:stun.schlund.de' },
							{ url : 'stun:stun.l.google.com:19302' },
							{ url : 'stun:stun1.l.google.com:19302' },
							{ url : 'stun:stun2.l.google.com:19302' },
							{ url : 'stun:stun3.l.google.com:19302' },
							{ url : 'stun:stun4.l.google.com:19302' },
							{ url : 'stun:stun.voiparound.com' },
							{ url : 'stun:stun.voipbuster.com' },
							{ url : 'stun:stun.voipstunt.com' },
							{ url : 'stun:stun.voxgratia.org' },
							{
								url        : 'turn:numb.viagenie.ca',
								credential : 'wtsplayer',
								username   : 'fenok2112@gmail.com' //TODO: register wtsplayer@gmail.com user
							}
						]
					},
					debug  : 1
				} );

			_peer.on( 'open', function( id )
			{
				var onConnected = function()
				{
					_connectingToServer = false;
					_connectedToServer  = true;
					__elementsController.outputSystemMessage( "Подключение к серверу завершено" );
					callback( id );
				};

				if ( _serverTimeSync )
				{
					syncTime_Server( onConnected, failCallback );
				}
				else
				{
					onConnected();
				}
			} );

			_peer.on( 'error', function( err )
			{
				console.error( err.toString() );
				switch ( err.type )
				{
					case 'webrtc':
						failCallback( err, true );
						break;
					default:
						//fatal error
						failCallback( err );
						break;
				}
			} );

			_peer.on( 'connection', function( conn )
			{
				//TODO: make sure that reconnection of the same peer is processed correctly
				if ( conn.metadata.roomID !== '' && conn.metadata.roomID === currentRoomID && conn.metadata.password === currentPassword )
				{
					//Send initial info ASAP!!
					conn.on( 'open', function()
					{
						var data =
							{
								type : _self.sending.INITIAL_INFO,
								data : {
									state   : __stateController.getStateData(),
									initial : __elementsController.getInitialData()
								}
							};
						conn.send( data );
					} );

					//Handle incoming connections with universal handler
					connectionHandler( conn );
				}
				else
				{
					console.error( new Error( "Connection from foreign peer. Extremely rare yet possible. May not be actual error." ).toString() );
					conn.close();
				}
			} );

			//Handle incoming call
			callHandler();
		}
		else
		{
			failCallback( new Error( "Can't connect to server: already connected or connecting" ), false );
		}
	};

	this.dropAllConnections = function( callback )
	{
		abortActiveRequests();

		var onDropped = function()
		{
			__stateController.onLeavedRoom();
			init();
			callback();
		};

		if ( peer && !peer.destroyed )
		{
			_peer.on( 'close', function()
			{
				onDropped();
			} );
			_peer.destroy();
		}
		else
		{
			onDropped();
		}
	};

	this.fakeReload = function( callback, failCallback )
	{
		if ( _connectedToServer )
		{
			abortActiveRequests();
			if ( currentRoomID !== '' ) //started joining or joined
			{
				_joinedRoom = true;
				_self.leaveRoom( callback, failCallback );
			}
			else
			{
				callback();
			}
		}
		else
		{
			if ( _connectingToServer )
			{
				_self.dropAllConnections( function()
				{
					_self.connectToServer( callback, failCallback );
				} );
			}
			else
			{
				_self.connectToServer( callback, failCallback );
			}
		}
	};

	function abortActiveRequests()
	{
		for ( var ind = 0; ind < _activeRequests.length; ++ind )
		{
			_activeRequests[ ind ].abort();
		}
	}

	function callHandler()
	{
		_peer.on( 'call', function( call )
		{
			if ( call.metadata.roomID !== '' && call.metadata.roomID === currentRoomID && call.metadata.password === currentPassword )
			{
				if ( _joinedVoiceChat )
				{
					if ( _audioStream === null && call.metadata.callType === _self.callTypes.INITIAL )
					{
						_dataConnections[ call.peer ].send( {
							type : _self.sending.FAKE_CALL,
							data : _self.callTypes.ANSWER
						} );
					}
					call.answer( _audioStream );
					_calls[ call.peer ] = call;
					applyCallHandlers( call.peer );
				}
				else
				{
					call.close();
				}
			}
			else
			{
				console.error( new Error( "Call from foreign peer. Extremely rare yet possible. May not be actual error." ).toString() );
				call.close();
			}
		} );
	}

	function applyCallHandlers( peer )
	{
		_calls[ peer ].on( 'error', function( err )
		{
			console.error( err );
		} );

		_calls[ peer ].on( 'stream', function( stream )
		{
			__elementsController.onPeerJoinedVoiceChat( peer );
			__elementsController.onGotAudioStream( peer, stream );
		} );

		_calls[ peer ].on( 'close', function()
		{
			if ( util.browser === 'Firefox' )
			{
				console.log( "mediaConnection's 'close' event worked on Firefox! Time to remove the DROPPED_CALL workaround." );
			}
		} );
	}

	//Add connection to dataConnections, remove on 'close' or 'error'
	function connectionHandler( conn )
	{
		_dataConnections[ conn.peer ] = conn;
		conn.on( 'open', function()
		{
			__elementsController.onPeerConnected( conn.peer );
			conn.on( 'data', function( data )
			{
				switch ( data.type )
				{
					case _self.sending.FAKE_CALL:
						if ( _joinedVoiceChat )
						{
							if ( data.data === _self.callTypes.ANSWER )
							{
								if ( _calls[ conn.peer ] === undefined )
								{
									_calls[ conn.peer ] = null;
								}
							}
							else
							{
								if ( _audioStream !== null )
								{
									callToPeer( conn.peer, _self.callTypes.ANSWER );
								}
								else
								{
									conn.send( { type : _self.sending.FAKE_CALL, data : _self.callTypes.ANSWER } );
									_calls[ conn.peer ] = null;
								}
							}
							__elementsController.onPeerJoinedVoiceChat( conn.peer );
						}
						break;
					case _self.sending.INITIAL_INFO:
						__stateController.onRecieved( _self.sending.STATE, conn.peer, data.data.state );
						__elementsController.onRecieved( _self.sending.INITIAL_INFO, conn.peer, data.data.initial );
						break;
					case _self.sending.MESSAGE:
					case _self.sending.DATA_SOURCE:
					case _self.sending.NICK:
						__elementsController.onRecieved( data.type, conn.peer, data.data );
						break;
					case _self.sending.STATE:
					case _self.sending.WAITING_STATUS:
						__stateController.onRecieved( data.type, conn.peer, data.data );
						break;
					case _self.sending.DROPPED_CALL:
						if ( _calls[ conn.peer ] !== undefined )
						{
							if ( _calls[ conn.peer ] !== null )
							{
								_calls[ conn.peer ].close();
							}
							delete _calls[ conn.peer ];
							__elementsController.onPeerLeavedVoiceChat( conn.peer );
						}
						break;
					case _self.sending.TIMESYNC_INFO:
						if ( !_serverTimeSync )
						{
							_ts.receive( conn.peer, data );
						}
						break;
					default:
						alert( 'Unrecognized data.type' );
						break;
				}
			} );
		} );

		conn.on( 'close', function()
		{
			/*TODO: testing showed rare connection drop, we can try to re-establish the connection*/
			delete _dataConnections[ conn.peer ];
			if ( _calls[ conn.peer ] !== undefined )
			{
				if ( _calls[ conn.peer ] !== null )
				{
					_calls[ conn.peer ].close();
				}
				delete _calls[ conn.peer ];
				__elementsController.onPeerLeavedVoiceChat( conn.peer );
			}
			__stateController.onPeerDeleted( conn.peer );
			__elementsController.onPeerDeleted( conn.peer );
		} );

		conn.on( 'error', function( err )
		{
			//TODO: make sure that close event always fires after fatal error
			console.error( err.toString() );
		} );
	}

	this.getRoomStatus = function( roomID, successCallback, failCallback )
	{
		if ( _connectedToServer )
		{
			GETFromServer( '/getRoomStatus?roomID=' + encodeURIComponent( roomID ),
				function( status )
				{
					successCallback( status );
				}, failCallback );
		}
		else
		{
			var err = new Error( "You must be connected to server" );
			console.error( err.toString() );
			failCallback( err );
		}
	};

	this.getRoomID = function( successCallback, failCallback )
	{
		if ( _localRoomIDGeneration )
		{
			successCallback( generateNextRandomString() );
		}
		else
		{
			if ( _connectedToServer )
			{
				GETFromServer( '/getRoomID',
					function( data )
					{
						successCallback( data );
					}, failCallback );
			}
			else
			{
				var err = new Error( "You must be connected to server" );
				console.error( err.toString() );
				failCallback( err );
			}
		}
	};

	//SPECIAL

	//Creating or joining room, reporting result, connect to all peers, get all initial states (aka initial data)
	//also calling to all peers, though it's not necessary for joining
	this.joinRoom = function( roomID, password, successResponsesArray, joinedCallback, connectionProblemsCallback, unexpectedResponseCallback, failCallback )
	{
		if ( _connectedToServer && !_joinedRoom && currentRoomID === '' && roomID !== '' )
		{
			currentRoomID   = roomID;
			currentPassword = password;
			getPeers_initial( function( peers, response )
			{
				if ( successResponsesArray.indexOf( response ) !== -1 )
				{
					var peersToConnect     = peers;
					var initialStatesToGet = peersToConnect.length;
					var timeIsSynced       = _serverTimeSync;

					var onJoinConditionChanged = function()
					{
						if ( peersToConnect.length === 0 && initialStatesToGet === 0 && timeIsSynced )
						{
							_joinedRoom = true;
							__elementsController.outputSystemMessage( "Вход в комнату выполнен" );
							__stateController.onJoinedRoom();
							joinedCallback( roomID ); //TODO: remove ASAP!!
						}
					};

					var onConnectedToAllPeers = function()
					{
						if ( !_serverTimeSync )
						{
							syncTime_Peers( function()
							{
								timeIsSynced = true;
								onJoinConditionChanged();
							} )
						}
						else
						{
							onJoinConditionChanged();
						}
					};

					var controlConnectionToPeer = function( peer )
					{
						connectToPeer( peer, function()
						{
							//success
							controlInitialStateRecieving( peer, function()
							{
								if ( --initialStatesToGet === 0 )
								{
									onJoinConditionChanged();
								}

							} );

							peersToConnect = peersToConnect.filter( function( e )
							{
								return e !== peer;
							} );

							if ( peersToConnect.length === 0 )
							{
								onConnectedToAllPeers();
							}
						} );
					};

					if ( peersToConnect.length === 0 )
					{
						onConnectedToAllPeers();
					}

					peers.forEach( controlConnectionToPeer );

					var retryConnection = function()
					{
						if ( peersToConnect.length !== 0 )
						{
							getPeers( function( actualPeers )
							{
								if ( actualPeers !== null )
								{
									peersToConnect = peersToConnect.filter(function(e)
									{
										if (actualPeers.indexOf( e ) === -1)
										{
											--initialStatesToGet;

											_dataConnections[ e ].close();
											delete _dataConnections[ e ];

											return false;
										}
										else
										{
											return true;
										}
									});
									if ( peersToConnect.length === 0 )
									{
										onConnectedToAllPeers();
									}
									else
									{
										peersToConnect.forEach(function(peer)
										{
											_dataConnections[ peer ].close();
											delete _dataConnections[ peer ];

											controlConnectionToPeer( peer );
										});

										connectionProblemsCallback();
									}
								}
							}, failCallback );
							setTimeout( retryConnection, _joinTimeout );
						}
					};
					setTimeout( retryConnection, _joinTimeout );
				}
				else
				{
					if ( response === _self.responses.CREATED || response === _self.responses.JOINED )
					{
						_joinedRoom = true;
						_self.leaveRoom( function()
						{
							unexpectedResponseCallback( response );
						}, failCallback )
					}
					else
					{
						currentRoomID = '';
						unexpectedResponseCallback( response );
					}
				}
			}, failCallback );
		}
		else
		{
			console.error( new Error( "Can't join room: not connected to server, already joined room or already joining room. Also, roomID must be non-empty" ).toString() );
		}
	};

	this.leaveRoom = function( callback, failCallback )
	{
		if ( _connectedToServer && _joinedRoom )
		{
			GETFromServer( '/leaveRoom?roomID=' + encodeURIComponent( currentRoomID ) + '&password=' + encodeURIComponent( currentPassword ) + '&peerID=' + encodeURIComponent( _peer.id ),
				function( data )
				{
					//TODO: check data.type? That doesn't matter at all though...
					callback();
				}, failCallback );

			currentRoomID   = '';
			currentPassword = '';

			if ( _joinedVoiceChat )
			{
				_self.leaveVoiceChat();
			}

			_joinedRoom = false;
			for ( var prop in _dataConnections )
			{
				_dataConnections[ prop ].close();
				delete _dataConnections[ prop ];
			}

			__stateController.onLeavedRoom();
		}
		else
		{
			failCallback( new Error( "Can't leave room: not connected to server or not joined room" ) );
		}
	};

	this.leaveVoiceChat = function()
	{
		if ( _connectedToServer && _joinedRoom && _joinedVoiceChat )
		{
			_joinedVoiceChat = false;
			_audioStream     = null;
			for ( var prop in _calls )
			{
				if ( _calls[ prop ] !== null )
				{
					_calls[ prop ].close();
				}
				delete _calls[ prop ];
			}
			_self.send( _self.sending.DROPPED_CALL );
		}
		else
		{
			console.error( new Error( "Can't leave voice chat: not connected to server, not joined room or not joined voice chat" ).toString() );
		}
	};

	this.joinVoiceChat = function( audioStream )
	{
		if ( _connectedToServer && _joinedRoom && !_joinedVoiceChat )
		{
			_audioStream     = audioStream;
			_joinedVoiceChat = true;
			initiateCallToAllPeers();
		}
		else
		{
			console.error( new Error( "Can't join voice chat: not connected to server, not joined room or already joined voice chat" ).toString() );
		}
	};

	function initiateCallToAllPeers()
	{
		if ( _audioStream === null )
		{
			askForCall();
		}
		else
		{
			_self.get( _self.getting.OTHER_PEERS_ID ).forEach( function( peer )
			{
				callToPeer( peer, _self.callTypes.INITIAL );
			} );
		}
	}

	function syncTime_Server( callback, failCallback )
	{
		var fastSynced = false;

		_ts.on( 'sync', function( state )
		{
			if ( state === 'end' )
			{
				console.log( "Full sync offset: ", _ts.offset );
				__elementsController.outputSystemMessage( "Точная синхронизация времени завершена" );
			}
		} );

		_ts.on( 'change', function( offset )
		{
			if ( !fastSynced )
			{
				fastSynced = true;
				console.log( "Fast sync offset: ", offset );
				callback();
			}
		} );

		_ts.on( 'error', function( error )
		{
			failCallback( error );
		} );

		_ts.sync();
	}

	function syncTime_Peers( callback )
	{

		_ts.options.peers = _self.get( _self.getting.OTHER_PEERS_ID );

		_ts.send = function( id, data )
		{
			var conn = _dataConnections[ id ];

			if ( conn )
			{
				data.type = _self.sending.TIMESYNC_INFO;
				conn.send( data );
			}
			else
			{
				console.error( new Error( 'Timesync: cannot send message: not connected to ' + id ).toString() );
			}
		};

		_ts.on( 'sync', function( state )
		{
			if ( state === 'end' )
			{
				callback();
			}
		} );

		_ts.sync();
	}

	function callToPeer( peer, callType )
	{
		_calls[ peer ] = _peer.call( peer, _audioStream, {
			metadata : {
				roomID   : currentRoomID,
				password : currentPassword,
				callType : callType
			}
		} );
		applyCallHandlers( peer );
	}

	function askForCall()
	{
		_self.send( _self.sending.FAKE_CALL, _self.callTypes.INITIAL );
	}

	function controlInitialStateRecieving( peer, callback )
	{
		var callIsNeeded = true;
		_dataConnections[ peer ].on( 'data', function( data )
		{
			if ( data.type === _self.sending.INITIAL_INFO )
			{
				if ( callIsNeeded )
				{
					callback();
					callIsNeeded = false;
				}
			}
		} );

		_dataConnections[ peer ].on( 'close', function()
		{
			if ( callIsNeeded )
			{
				callback();
				callIsNeeded = false;
			}
		} );
		//TODO: make sure that close event always fires after fatal error
	}

	function connectToPeer( peer, successCallback )
	{
		var conn = _peer.connect( peer, {
			serialization : 'json',
			reliable      : _reliableDataChannels,
			metadata      : {
				roomID   : currentRoomID,
				password : currentPassword
			}
		} );
		connectionHandler( conn );
		conn.on( 'open', function()
		{
			var data =
				{
					type : _self.sending.INITIAL_INFO,
					data : {
						state   : null,
						initial : __elementsController.getInitialData()
					}
				};
			conn.send( data );
			successCallback();
		} );
	}

	function getPeers( callback, failCallback )
	{
		GETFromServer( '/getPeers?roomID=' + encodeURIComponent( currentRoomID ) + '&password=' + encodeURIComponent( currentPassword ),
			function( data )
			{
				callback( data );
			}, failCallback );
	}

	function getPeers_initial( callback, failCallback )
	{
		GETFromServer( '/joinRoom?roomID=' + encodeURIComponent( currentRoomID ) + '&password=' + encodeURIComponent( currentPassword ) + '&peerID=' + encodeURIComponent( _peer.id ),
			function( data )
			{
				switch ( data.type )
				{
					case _self.responses.JOINED:
						callback( data.peers, data.type );
						break;
					default:
						alert( 'Unrecognized response' );
					case _self.responses.CREATED:
					case _self.responses.JOINED_BEFORE:
					case _self.responses.WRONG_PASSWORD:
						callback( [], data.type );
						break;
				}
			}, failCallback );
	}

	function GETFromServer( url, callback, failCallback )
	{
		var xhr = new XMLHttpRequest();

		xhr.open( 'GET', url, true );

		xhr.send();

		xhr.onreadystatechange = function()
		{
			if ( this.readyState === 4 )
			{
				_activeRequests = _activeRequests.filter( function( e )
				{
					return e !== this;
				} );

				if ( this.status === 200 )
				{
					callback( JSON.parse( this.responseText ) );
				}
				else
				{
					var err = new Error( this.status ? this.statusText : 'You lost the server. How could you?' );
					console.error( err.toString() );
					failCallback( err );
				}
			}
		};

		xhr.onabort = function()
		{
			_activeRequests = _activeRequests.filter( function( e )
			{
				return e !== this;
			} );

			var err = new Error( "Request aborted" );
			console.error( err.toString() );
		};

		_activeRequests.push( xhr );
	}

	function generateNextRandomString()
	{
		return Math.random().toString( 36 ).substr( 2, 10 );
	}

	//GENERIC
	this.send = function( type, data )
	{
		if ( _connectedToServer )
		{
			var message =
				{
					type : type,
					data : data
				};
			for ( var prop in _dataConnections )
			{
				_dataConnections[ prop ].send( message );
			}
		}
		else
		{
			console.error( new Error( "Can't send data: not connected to server" ).toString() );
		}
	};

	//TODO: getters/setters(senders)? (same as session implementation)
	//GENERIC
	this.get = function( what )
	{
		switch ( what )
		{
			case _self.getting.CONNECTED_TO_SERVER:
				return _connectedToServer;
				break;
			case _self.getting.JOINED_ROOM:
				return _joinedRoom;
				break;
			case _self.getting.JOINED_VOICE_CHAT:
				return _joinedVoiceChat;
				break;
			case _self.getting.SELF_ID:
				return _peer.id;
				break;
			case _self.getting.OTHER_PEERS_ID:
				return Object.getOwnPropertyNames( _dataConnections );
				break;
			case _self.getting.SELF_IS_SUPER_PEER:
				var superPeerID = _peer.id;
				for ( var prop in _dataConnections )
				{
					if ( prop > superPeerID )
					{
						superPeerID = prop;
					}
				}
				return ( superPeerID === _peer.id );
				break;
			default:
				alert( "peerController.get: unrecognized 'what'" );
				break;
		}
	};

	this.getYoutubeVideoInfo = function( ID, callback, failCallback )
	{
		GETFromServer( '/getYoutubeVideoInfo?ID=' + encodeURIComponent( ID ), callback, failCallback );
	};

	//Function to be used to get synced timestamp
	//Defaults to local timestamp
	this.currentTimestamp = _ts.now;//Date.now;
	//--

	init();
};