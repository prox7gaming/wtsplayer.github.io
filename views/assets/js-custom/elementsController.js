/*
 The MIT License

 Copyright (c) 2016 Leonid Fenko aka Fen-ok <fenok2112@gmail.com>, Georgy Kosturov aka Geosins <geosins@yandex.ru>
 */

var wtsplayer = wtsplayer || {};
//TODO: clean code
wtsplayer.elementsController = function()
{
	this.externals =
	{
		stateController : {
			onPlayerPlay    : null,
			onPlayerPause   : null,
			onPlayerSeek    : null,
			onPlayerWaiting : null,
			onPlayerCanPlay : null,
			onPlayerEnded   : null
		},
		peerController  : {
			send                : null,
			sending             : null,
			joinRoom            : null,
			connectToServer     : null,
			dropAllConnections  : null,
			getRoomStatus       : null,
			getRoomID           : null,
			joinVoiceChat       : null,
			leaveVoiceChat      : null,
			responses           : null,
			fakeReload          : null,
			getYoutubeVideoInfo : null,
			get                 : null,
			getting             : null
		}
	};

	var __stateController = this.externals.stateController;
	var __peerController  = this.externals.peerController;

	var _self = this;

	var _resetVideoCurrentTimeOnSourceChange = false;//true;

	var _video             = document.getElementById( "video" );
	var _playPauseButton   = document.getElementById( "playerPlayPauseButton" );
	var _volumeArea        = document.getElementById( "vol" );
	var _volume            = document.getElementById( "volume" );
	var _volumeButton      = document.getElementById( "volume_button" );
	var _seekRange         = document.getElementById( "playerSeekRange" );
	var _currentTimeOutput = document.getElementById( "playerCurrentTimeOutput" );
	var _addOffsetButton   = document.getElementById( "addOffsetButton" );
	var _delOffsetButton   = document.getElementById( "delOffsetButton" );
	var _subOffsetButton   = document.getElementById( "subOffsetButton" );
	var _quality           = document.getElementById( "quality" );
	var _fullscreenButton  = document.getElementById( "fullscreen" );
	var _backOvervayBut    = document.getElementById( "backOverlayBut" );
	var _sendMessageButton = document.getElementById( "sendMessageButton" );
	var _messageInput      = document.getElementById( "messageInput" );
	var _chatParent        = document.getElementById( "chatParent" );

	var _roomURL         = document.getElementById( "roomURL" );
	var _roomURLtext     = document.getElementById( "roomURLtext" );
	var _copyURL         = document.getElementById( "copyURL" );
	var _roomURLpassArea = document.getElementById( "roomURLpassArea" );
	var _roomURLpass     = document.getElementById( "roomURLpass" );
	var _showPass        = document.getElementById( "showPass" );
	var _copyPass        = document.getElementById( "copyPass" );
	var _passwordCheck   = document.getElementById( "passwordCheck" );
	var _generateId      = document.getElementById( "generateId" );
	var _generatePass    = document.getElementById( "generatePass" );
	var _roomIdInput     = document.getElementById( "roomId" );
	var _wrongId         = document.getElementById( "wrongId" );
	var _wrongPassword   = document.getElementById( "wrongPassword" );
	var _title           = document.getElementById( "title" );
	var _nick            = document.getElementById( "nick" );
	var _passwordInput   = document.getElementById( "passwordInput" );
	var _overlay         = document.getElementById( "overlay" );
	var _joinButton      = document.getElementById( "joinButton" );

	var _inputLink = document.getElementById( "inputLink" );
	var _localURL  = document.getElementById( "localURL" );
	var _seedLocal = document.getElementById( "seedLocal" );
	var _peersSrc  = document.getElementById( "peersSrc" );
	var _follow    = document.getElementById( "follow" );

	var _audioChatStatus = document.getElementById( "audioChatStatus" );
	var _peerListParent  = document.getElementById( "peerListParent" );
	var _peerList        = document.getElementById( "peerList" );
	var _peerTable       = document.getElementById( "peerTable" );
	var _peerListButton  = document.getElementById( "peerListButton" );
	var _noteEmptyRoom   = document.getElementById( "noteEmptyRoom" );

	var _darkThemeCheckbox = document.getElementById( "darkThemeCheckbox" );
	var _darkCSS           = document.getElementById( "darkCSS" );

	var _videoLoaded;
	var _seekRangeIsDragged = false;
	var _muteVideo;
	var _mouseOnChat;
	var _chatTimeout        = null;
	var _session;
	var _noReload           = true;
	var _audioStream;
	var _scrollbar;
	var _videoSrcChange;
    var _client             = null;
    var _torrent            = null;
	var _videoSrcTabs       = 'inputLink';
	var _peers              = {};
	var _peerVars           = Object.freeze( {
		NICK      : 0,
		VIDEO_SRC : 1,
		ROW       : 2,
		AUDIO     : 3,
		RANGE     : 4,
		MUTED     : 5
	} );

	//switching user interface
	switchToPlay = function()
	{
		_playPauseButton.state    = 'play';
		_playPauseButton.src      = "play.svg";
		_playPauseButton.disabled = false;
	};

	switchToPause = function()
	{
		_playPauseButton.state    = 'pause';
		_playPauseButton.src      = "pause.svg";
		_playPauseButton.disabled = false;
	};

	switchToWaiting = function()
	{
		_playPauseButton.state    = 'waiting';
		_playPauseButton.src      = "wait.svg";
		_playPauseButton.disabled = true;
	};

	function onVideoLoading()
	{
		var nodesToHide = document.getElementsByClassName( 'video-sensitive' );
		for ( var i = 0; i < nodesToHide.length; ++i )
		{
			nodesToHide[ i ].disabled = 'disabled';
		}
	}

	function onVideoLoaded()
	{
		_self.outputSystemMessage( "Видео загружено" );
		var nodesToHide = document.getElementsByClassName( 'video-sensitive' );
		for ( var i = 0; i < nodesToHide.length; ++i )
		{
			nodesToHide[ i ].removeAttribute( 'disabled' );
		}
	}

	_playPauseButton.addEventListener( 'click', function()
	{
		if ( _playPauseButton.state === 'play' )
		{
			__stateController.onPlayerPlay( _video.currentTime );
		}
		else if ( _playPauseButton.state === 'pause' )
		{
			__stateController.onPlayerPause( _video.currentTime );
		}
	} );

	_seekRange.onmousedown = function()
	{
		_seekRange.onchange = null;
		_seekRangeIsDragged = true;

	};

	_seekRange.onmouseup = function()
	{
		_seekRange.onchange = function()
		{
			//converting to ms
			var playerTime = _seekRange.value * ( _video.duration / 100 );
			__stateController.onPlayerSeek( playerTime );
		};
		_seekRangeIsDragged = false;
	};

	_video.addEventListener( 'timeupdate', function()
	{
		if ( !_seekRangeIsDragged )
		{
			function val( n )
			{
				return n < 10 ? "0" + n : n;
			}

			if (_video.duration)
			{
				_seekRange.value = ( 100 / _video.duration ) * _video.currentTime;
			}
			else
			{
				_seekRange.value = 0;
			}
			var time                     = _video.currentTime / 1000 >> 0;
			_currentTimeOutput.innerHTML = (time < 3600 ? (time / 60 >> 0) : ((time / 3600 >> 0) + ":" + val( time % 3600 / 60 >> 0 ))) + ":" + val( time % 60 );
		}
	} );

	_video.addEventListener( 'waiting', function()
	{
		__stateController.onPlayerWaiting();
	} );

	_video.addEventListener('loaded', function()
	{
		if ( !_videoLoaded )
		{
			_videoLoaded = true;
			onVideoLoaded();
		}
	});

	_video.addEventListener( 'canplay', function()
	{
		__stateController.onPlayerCanPlay();
	} );

	_video.addEventListener( 'ended', function()
	{
		__stateController.onPlayerEnded();
	} );

	_video.addEventListener( 'underflow', function()
	{
		__stateController.onPlayerSeek( _video.offset );
	} );
    
	function onVideoClick()
	{
        var go = true;
        _video.onclick = function()
        {
            _fullscreenButton.click();
            go = false;
        }
        setTimeout(function()
        {
            if ( go && _playPauseButton.state != 'waiting' ) _playPauseButton.click();
            _video.onclick = onVideoClick;            
        },250)
	}
    _video.onclick = onVideoClick;
    
    

	function showOffset()
	{
		if ( _video.offset > 0 )
		{
			_delOffsetButton.innerHTML = "-" + ( _video.offset / 1000 );
		}
		else if ( _video.offset == 0 )
		{
			_delOffsetButton.innerHTML = "0";
		}
		else
		{
			_delOffsetButton.innerHTML = "+" + ( (_video.offset / 1000) * (-1) );
		}
	}

	_addOffsetButton.addEventListener( 'click', function()
	{
		_video.changeOffset( _video.offset + 100 );
		showOffset();
        _addOffsetButton.blur();
	} );

	_delOffsetButton.addEventListener( 'click', function()
	{
		_video.changeOffset( 0 );
		showOffset();
        _delOffsetButton.blur();
	} );

	_subOffsetButton.addEventListener( 'click', function()
	{
		_video.changeOffset( _video.offset - 100 );
		showOffset();
        _subOffsetButton.blur();
	} );

	/*
	 ***_video***

	 INTERFACE:

	 Events to dispatch:
	 timeupdate
	 ended
	 waiting -- waiting for the video to buffer
	 canplay -- asynchronously emitted after waiting

	 Properties:
	 volume -- [0;1]
	 muted
	 currentTime -- ms
	 duration -- ms

	 Methods:
	 play
	 pause
	 wait -- force buffering (waiting)
	 changeQuality
	 changeOffset
	 clear

	 BEHAVIOR:

	 The first event to be emitted is 'canplay', and the video must be paused

	 Quality lists are constructed in 'constructors'
	 */

	function constructVideoContent_dummy( muted, volume, currentTime )
	{
		volume      = _video.volume !== undefined ? _video.volume : ( volume !== undefined ? volume : 1 );
		muted       = _video.muted || muted || false;
		currentTime = _video.currentTime || currentTime || 0;

		if ( _resetVideoCurrentTimeOnSourceChange )
		{
			//Program seek to 0
			currentTime = 0;
			_video.dispatchEvent( new Event( 'timeupdate' ) );
			__stateController.onPlayerSeek( 0 );
		}


		_videoLoaded = false;
		onVideoLoading();

		_video.play          = function()
		{
		};
		_video.pause         = function()
		{
		};
		_video.wait          = function()
		{
		};
		_video.changeQuality = function( data )
		{
		};
		_video.changeOffset  = function( n )
		{
		};

		_video.dispatchEvent( new Event( 'waiting' ) );

		Object.defineProperties( _video, {
			"volume"      : {
				configurable : true,
				set          : function( n )
				{
					volume = n;
				},
				get          : function()
				{
					return volume;
				}
			},
			"muted"       : {
				configurable : true,
				set          : function( n )
				{
					muted = n;
				},
				get          : function()
				{
					return muted;
				}
			},
			"currentTime" : {
				configurable : true,
				set          : function( n )
				{
					currentTime = n;
				},
				get          : function()
				{
					return currentTime;
				}
			},
			"duration"    : {
				configurable : true,
				get          : function()
				{
					return 0;
				}
			}
		} );

		_quality.onchange  = null;
		_quality.innerHTML = '';
		var opt            = document.createElement( "option" );
		opt.innerHTML      = "Source";
		opt.value          = 'source';
		_quality.appendChild( opt );
		_quality.disabled          = "disabled";
		_video.offset              = 0;
		_delOffsetButton.innerHTML = "0";

		if ( _video.clear )
		{
			_video.clear();
		}
		else
		{
			_video.innerHTML = '';
		}
		_video.clear = function()
		{
			_video.innerHTML = '';
		};
	}

	function constructVideoContent_youtubeDirect( videoLink )
	{
		var videoElement = getCleanVideoContent_video();

		var videoID       = parseYoutubeLinkIntoID( videoLink );
		_quality.onchange = function()
		{
			_video.changeQuality( this.value );
		};

		//TODO: make it nicer
		var parse = function(text)
		{
			if (text.indexOf('url_encoded_fmt_stream_map=') !== -1)
			{
				text       = text.substr( text.indexOf( 'url_encoded_fmt_stream_map=' ) );
				text       = text.substring( text.indexOf( '=' ) + 1, text.indexOf( '&' ) === -1 ? text.length : text.indexOf( '&' ) );
				text       = decodeURIComponent( text );
				var links  = text.split( ',' );
				var url;
				var quality;
				var result = new Array();
				for ( var ind = 0; ind < links.length; ++ind )
				{
					url = links[ ind ].substr( links[ ind ].indexOf( 'url=' ) );
					url = url.substring( url.indexOf( '=' ) + 1, url.indexOf( '&' ) === -1 ? url.length : url.indexOf( '&' ) );
					url = decodeURIComponent( url );

					quality = links[ ind ].substr( links[ ind ].indexOf( 'quality=' ) );
					quality = quality.substring( quality.indexOf( '=' ) + 1, quality.indexOf( '&' ) === -1 ? quality.length : quality.indexOf( '&' ) );
					quality = decodeURIComponent( quality );

					result.push( { url : url, quality : quality } );
				}

				return (result);
			}
			else
			{
				return null;
			}
		};

		__peerController.getYoutubeVideoInfo( videoID, function( text )
		{
			var obj            = parse( text );
			_quality.innerHTML = "";
			_quality.removeAttribute( 'disabled' );
			if ( obj )
			{
				for ( var i = 0; i < obj.length; i++ )
				{
					var opt       = document.createElement( "option" );
					opt.innerHTML = obj[ i ].quality;
					opt.value     = obj[ i ].url;
					_quality.appendChild( opt );
				}

				videoElement.src = _quality.value;

				_video.clear = function()
				{
					videoElement.pause();
					videoElement.src = "";
					videoElement.load();
					_video.innerHTML = '';
				}
			}
			else
			{
				_self.outputSystemMessage( "Не удалось загрузить видео" );
			}
		}, function( err )
		{
			_self.outputSystemMessage( "Не удалось загрузить видео" );
		} );
	}

	function constructVideoContent_webtorrentMagnet( magnetLink )
	{
		_quality.onchange = null;

		var videoElement = getCleanVideoContent_video();

		if (!_client) _client = new WebTorrent();
		_client.add( magnetLink, function( torrent )
		{
			var file = torrent.files[ 0 ];

			file.renderTo( videoElement, function( err, elem )
			{
			} );
		} );
		_video.clear = function()
		{
			_client.destroy();
            _client = null;
			videoElement.pause();
			videoElement.src = '';
			videoElement.load();
			_video.innerHTML = '';
		};
	}

	function constructVideoContent_directSource( directSource )
	{
		var videoElement = getCleanVideoContent_video();

		videoElement.src = directSource;
        videoElement.onerror = function()
        {
            _self.outputSystemMessage( "Не удалось загрузить видео" );
        }
        
		_video.clear = function()
		{
            videoElement.onerror = "";
			videoElement.pause();
			videoElement.src = "";
			videoElement.load();
			_video.innerHTML = '';
		};
	}

	function getCleanVideoContent_video()
	{
		constructVideoContent_dummy();
		var videoElement                 = document.createElement( 'video' );
		videoElement.style.width         = "100%";
		videoElement.style.height        = "100%";
		videoElement.style.verticalAlign = "bottom";

		_video.appendChild( videoElement );

		videoElement.volume      = _video.volume;
		videoElement.muted       = _video.muted;
		var initialCurrentTime = _video.currentTime;

		var emittedCanPlay = false;
		var ended          = false;
		videoElement.addEventListener( 'timeupdate', function()
		{
			_video.dispatchEvent( new Event( 'timeupdate' ) );
		} );

		videoElement.addEventListener( 'ended', function()
		{
			videoElement.pause(); //TODO: check whether that's correct
			if ( !ended )
			{
				ended = true;
				_video.dispatchEvent( new Event( 'ended' ) );
			}
		} );

		videoElement.addEventListener( 'waiting', function()
		{
			videoElement.pause(); //TODO: check whether that's correct
			if ( emittedCanPlay )
			{
				_video.dispatchEvent( new Event( 'waiting' ) );
			}
		} );

		videoElement.addEventListener( 'canplay', function()
		{
			if (!emittedCanPlay)
			{
				_video.dispatchEvent(new Event('loaded'));
			}
			if ( !ended )
			{
				_video.dispatchEvent( new Event( 'canplay' ) );
				emittedCanPlay = true;
			}
		} );

		Object.defineProperties( _video, {
			"volume"      : {
				configurable : true,
				set          : function( n )
				{
					videoElement.volume = n;
				},
				get          : function()
				{
					return (videoElement.volume);
				}
			},
			"muted"       : {
				configurable : true,
				set          : function( n )
				{
					videoElement.muted = n;
				},
				get          : function()
				{
					return (videoElement.muted);
				}
			},
			"currentTime" : {
				configurable : true,
				set          : function( n )
				{
					if ( n - _video.offset < videoElement.duration * 1000 )
					{
						ended = false;
					}

					if ( n - _video.offset < 0 )
					{
						setTimeout( function()
						{
							_video.dispatchEvent( new Event( 'underflow' ) );
						}, 1 );
					}
					else if ( n - _video.offset >= videoElement.duration * 1000 )
					{
						videoElement.currentTime = videoElement.duration;
						ended                    = true;
						setTimeout( function()
						{
							_video.dispatchEvent( new Event( 'ended' ) );
						}, 1 );
					}
					else
					{
						videoElement.currentTime = (n - _video.offset) / 1000;
					}
					setTimeout( function()
					{
						_video.dispatchEvent( new Event( 'timeupdate' ) );
					}, 1 );
				},
				get          : function()
				{
					return ( videoElement.currentTime * 1000 + _video.offset );
				}
			},
			"duration"    : {
				configurable : true,
				get          : function()
				{
					return (_video.offset > 0 ? videoElement.duration * 1000 : videoElement.duration * 1000 + _video.offset );
				}
			}
		} );

		_video.play  = function()
		{
			videoElement.play();
		};
		_video.pause = function()
		{
			videoElement.pause();
		};

		_video.wait = function()
		{
			if ( !ended && videoElement.currentTime !== videoElement.duration )
			{
				_video.play();
				_video.pause();
				if ( videoElement.readyState === 4 )
				{
					setTimeout( function()
					{
						_video.dispatchEvent( new Event( 'canplay' ) );
					}, 1 );
				}
			}
		};

		_video.changeQuality = function( src )
		{
			videoElement.src = src;
		};

		_video.changeOffset = function( n )
		{
			var tempOffset     = n - _video.offset;
			_video.offset      = n;
			_video.currentTime = _video.currentTime - ( tempOffset );
		};

		_video.currentTime = initialCurrentTime;
		
		return videoElement;
	}

	//TODO:{NOT CRITICAL} it is possible to set time to 0:00 with positive offset. Not affects the playback though.
	//TODO:{NOT CRITICAL} frequent clicks may set time beyond bounds. Not affects the playback though.
	//TODO: normal playback to the end causes infinite waiting after seek. It fixes itself on the second seek though.
	function constructVideoContent_youtubeIframe( videoLink )
	{
		constructVideoContent_dummy();
		var videoID = parseYoutubeLinkIntoID( videoLink );
		var player;
		var div     = document.createElement( 'div' );
		div.id      = "youtube-iframe";
		_video.appendChild( div );

		var qualities = {
			default : "auto",
			highres : "God",
			hd1080  : "1080p",
			hd720   : "720p",
			large   : "480p",
			medium  : "360p",
			small   : "240p"
		};

		player = new YT.Player( 'youtube-iframe', {
			height     : '100%',
			width      : '100%',
			videoId    : videoID,
			playerVars : {
				controls       : 0,
				disablekb      : 1,
				modestbranding : 1,
				showinfo       : 0,
				rel            : 0,
				origin         : window.location.hostname,
				enablejsapi    : 1,
				iv_load_policy : 3,
				start          : 0
			},
			events     : {
				'onReady'       : onPlayerReady,
				'onStateChange' : onPlayerStateChange
			}
		} );

		var buffering         = true;
		var emittedCanplay    = false;
		var ended             = false;
		var formedQualityList = false;

		var initialized = false;

		var waitingTimeout = null;

		var initialMuted       = _video.muted;
		var initialVolume      = _video.volume;
		var initialCurrentTime = _video.currentTime;

		function onPlayerStateChange( event )
		{
			if ( event.data === YT.PlayerState.BUFFERING )
			{
				if ( initialized ) player.pauseVideo();
				clearTimeout(waitingTimeout);
				if ( emittedCanplay )
				{
					_video.dispatchEvent( new Event( 'waiting' ) );
					buffering = true;
				}
			}
			else if ( (event.data === YT.PlayerState.PLAYING || event.data === YT.PlayerState.PAUSED) && buffering === true )
			{
				if ( !initialized )
				{
					//TODO: have no idea how, but it seems to work. Understand and optimize maybe?
					player.pauseVideo();
					_video.currentTime = initialCurrentTime;

					player.setVolume( initialVolume * 100 );
					if ( initialMuted === true )
					{
						player.mute();
					}
					else
					{
						player.unMute();
					}

					if ( !formedQualityList )
					{
						_quality.innerHTML = '';
						_quality.removeAttribute( 'disabled' );
						var availableQualities = player.getAvailableQualityLevels();
						for ( var prop in qualities )
						{
							if ( availableQualities.indexOf( prop ) !== -1 )
							{
								var opt       = document.createElement( "option" );
								opt.innerHTML = qualities[ prop ];
								opt.value     = prop;
								_quality.appendChild( opt );
							}
						}

						_quality.value = player.getPlaybackQuality();

						_quality.onchange = function()
						{
							_video.changeQuality( this.value );
						};

						formedQualityList = true;
					}
					setTimeout( function()
					{
						_video.wait();
						_video.dispatchEvent(new Event('loaded'));
					}, 1 ); //TODO: initial sync is not perfect =(
					initialized = true;
				}
				else if ( !ended )
				{
					_video.dispatchEvent( new Event( 'canplay' ) );
					buffering      = false;
					emittedCanplay = true;
				}
			}
			else if ( event.data === YT.PlayerState.ENDED )
			{
				//player.seekTo(player.getDuration());
				if ( !ended )
				{
					//buffering = false;//yup?
					ended = true;
					player.pauseVideo();
					_video.dispatchEvent( new Event( 'ended' ) );
				}
			}
		}

		function onPlayerReady()
		{
			//now player state is YT.PlayerState.CUED
			player.setPlaybackQuality( 'default' );
			player.mute();
			player.playVideo();

			initialMuted       = _video.muted;
			initialCurrentTime = _video.currentTime;
			initialVolume      = _video.volume;

			_video.clear       = function()
			{
				player.destroy();
				_video.innerHTML = '';
			};
			var lastCurrentTime = null;
			setInterval( function()
			{
				if ( player.getCurrentTime() !== lastCurrentTime || player.getCurrentTime() === 0 )
				{
					lastCurrentTime = player.getCurrentTime();
					_video.dispatchEvent( new Event( 'timeupdate' ) );
				}
			}, 500 );

			Object.defineProperties( _video, {
				"volume"      : {
					configurable : true,
					set          : function( n )
					{
						player.setVolume( n * 100 );
						initialVolume = n;
					},
					get          : function()
					{
						return (player.getVolume() / 100);
					}
				},
				"muted"       : {
					configurable : true,
					set          : function( n )
					{
						if ( n === true )
						{
							player.mute();
						}
						else
						{
							player.unMute();
						}
						initialMuted = n;
					},
					get          : function()
					{
						return (player.isMuted());
					}
				},
				"currentTime" : {
					configurable : true,
					set          : function( n )
					{
						if ( n - _video.offset < player.getDuration() * 1000 )
						{
							ended = false;
						}
						if ( n - _video.offset < 0 )
						{
							setTimeout( function()
							{
								_video.dispatchEvent( new Event( 'underflow' ) );
							}, 1 );
						}
						else if ( n - _video.offset >= player.getDuration() * 1000 )
						{
							player.pauseVideo();
							//player.seekTo(player.getDuration());
							ended = true;
							setTimeout( function()
							{
								_video.dispatchEvent( new Event( 'ended' ) );
							}, 1 );
						}
						else
						{
							player.seekTo( (n - _video.offset) / 1000, true );
						}
						setTimeout( function()
						{
							_video.dispatchEvent( new Event( 'timeupdate' ) );
						}, 1 );
						initialCurrentTime = n;//not actually initial from this point
					},
					get          : function()
					{
						if ( ended )
						{
							return player.getDuration() * 1000 + _video.offset;
						}
						else
						{
							return (player.getCurrentTime() * 1000 + _video.offset);
						}
					}
				},
				"duration"    : {
					configurable : true,
					get          : function()
					{
						return ( _video.offset > 0 ? player.getDuration() * 1000 : player.getDuration() * 1000 + _video.offset);
					}
				}
			} );

			_video.play  = function()
			{
				player.playVideo();
			};
			_video.pause = function()
			{
				player.pauseVideo();
			};
			_video.wait  = function()
			{
				if ( !ended && (initialCurrentTime - _video.offset) / 1000 < player.getDuration()/* && player.getCurrentTime() !== player.getDuration()*/ )
				{
					switch ( player.getPlayerState() )
					{
						case YT.PlayerState.PLAYING:
						case YT.PlayerState.ENDED:
							player.pauseVideo();
						case YT.PlayerState.PAUSED:
							//buffering = false; //weird //TODO: setting buffering to false causes infinite waiting on frequent seek. Also, IT IS POSSIBLE THAT IT IS TRUE AT THIS POINT. WHY.
							clearTimeout(waitingTimeout);
							waitingTimeout = setTimeout( function()
							{
								buffering = true;
								onPlayerStateChange({data:player.getPlayerState()});
							}, 300 ); //Actual buffering should start within this delay (if any)
							break;
						case YT.PlayerState.BUFFERING:
						default:
							break;
					}
				}
			};

			_video.changeQuality = function( quality )
			{
				player.setPlaybackQuality( quality );
			};

			_video.changeOffset = function( n )
			{

				var tempOffset     = n - _video.offset;
				_video.offset      = n;
				_video.currentTime = _video.currentTime - tempOffset;

			};
		}
	}

	_volumeArea.onwheel = _video.onwheel = function( event )
    {
        _video.volume = _volume.value = parseFloat(_volume.value)+(0.01*(event.deltaY<0?1:(-1)));
        
    }
	_volume.oninput = function( event )
	{
		_video.volume = event.target.value;
	}
	_volumeButton.onclick = function( event )
	{
		mute( _muteVideo, event.target, _video );
		_muteVideo = !_muteVideo;
        _volumeButton.blur();
	}
	function mute( muted, butt, obj )
	{
		if ( muted )
		{
			obj.muted = false;
			butt.src  = "/volume.svg";
		} else
		{
			obj.muted = true;
			butt.src  = "/mute.svg";
		}
	}
    
    _inputLink.onclick = function( event )
	{
		event.target.select();
	}
    
	_sendMessageButton.addEventListener( 'click', sendMsg );

	_messageInput.onkeydown = function( e )
	{
		if ( e.keyCode == "13" )
		{
			sendMsg();
		}
	};
	document.onkeypress     = function( e )
	{
		if ( document.activeElement.type != "text" && _overlay.className == "close" )
		{
			if ( e.which == "32" )
			{
				_playPauseButton.click();
			} else if ( e.which != "0" )
			{
				_messageInput.focus();
				if ( !e.keyCode )
				{
					_messageInput.value += String.fromCharCode( e.charCode );
				}
			}
		}
	}

	function parseYoutubeLinkIntoID( link )
	{
		var rx  = /^.*(?:(?:youtu\.be\/|v\/|vi\/|u\/\w\/|embed\/)|(?:(?:watch)?\?v(?:i)?=|\&v(?:i)?=))([^#\&\?]*).*/;
		var res = link.match( rx );
		return res === null ? null : res[ 1 ];
	}

	function sendMsg()
	{
		if ( _messageInput.value !== "" )
		{
			var messageData =
				{
					nick    : _session.nick || 'Someone',
					message : _messageInput.value
				};
			__peerController.send( __peerController.sending.MESSAGE, messageData );
			formMessage( messageData );
			_messageInput.value = '';
		}
		setTimeout( function()
		{
			_messageInput.blur();
		}, 100 );
	}

	_fullscreenButton.addEventListener( 'click', function()
	{
		// Note: FF nightly needs about:config full-screen-api.enabled set to true.

		if ( document.mozFullScreen || document.webkitIsFullScreen )
		{
			if ( document.cancelFullScreen )
			{
				document.cancelFullScreen();
			} else if ( document.webkitCancelFullScreen )
			{
				document.webkitCancelFullScreen();
			} else if ( document.mozCancelFullScreen )
			{
				document.mozCancelFullScreen();
			}
		}
		else
		{
			var el = document.body;
			if ( el.requestFullScreen )
			{
				el.requestFullScreen();
			} else if ( el.webkitRequestFullScreen )
			{
				el.webkitRequestFullScreen();
			} else if ( el.mozRequestFullScreen )
			{
				el.mozRequestFullScreen();
			}
		}
        _fullscreenButton.blur();
	} );

	_backOvervayBut.addEventListener( 'click', function()
	{
		_overlay.className = 'join';
	} );

	//SPECIAL
	this.wait = function()
	{
		switchToWaiting();
		_video.wait();
	};

	//SPECIAL
	this.play = function()
	{
		_video.play();
		switchToPause();
	};

	//SPECIAL
	this.pause = function()
	{
		_video.pause();
		switchToPlay();
	};

	//SPECIAL
	this.seek = function( playerTime )
	{
		_video.currentTime = playerTime;
	};

	//SPECIAL
	this.getPlayerCurrentTime = function()
	{
		return _video.currentTime;
	};

	function formMessage( messageData )
	{
		_self.outputSystemMessage( messageData.nick + ": " + messageData.message, "userColor" );
	};

	_chatParent.onmouseover = function( event )
	{
		_mouseOnChat = true;
		clearTimeout( _chatTimeout );
		_chatTimeout = setTimeout( function()
		{
			if ( _mouseOnChat )
			{
				_chatParent.className = "chat"
			}
		}, 500 )
	}
	_chatParent.onmouseout  = function()
	{
		clearTimeout( _chatTimeout );
		_mouseOnChat = false;
		_chatTimeout = setTimeout( function()
		{
			if ( !_mouseOnChat && _scrollbar.mouseup )
			{
				_chatParent.className = "";
				_scrollbar.toTop();
			}
		}, 350 )
	}

	function scrollbarTop( scrollbox )
	{
		o           = {};
		o.scrollbar = scrollbox.children[ 0 ];
		o.scrollbox = scrollbox.children[ 1 ];
		o.thumbElem = o.scrollbar.children[ 0 ];
		o.mouseup   = true;
		o.init      = function()
		{
			o.scrollbar.style.height = o.scrollbox.clientHeight + "px";
			if ( o.scrollbox.scrollHeight <= o.scrollbox.clientHeight )
			{
				o.ratio                  = 1;
				o.thumbElem.style.height = o.scrollbar.scrollHeight + "px";
			}
			else
			{
				o.ratio                  = o.scrollbox.scrollHeight / o.scrollbox.clientHeight;
				o.thumbElem.style.height = o.scrollbox.clientHeight / o.ratio + "px";
			}
		}
		o.init();
		with ( o )
		{
			thumbElem.onmousedown = function( e )
			{
				mouseup               = false;
				scrollbar.onmousedown = null;

				var thumbCoords = getCoords( thumbElem );
				var shiftY      = e.pageY - thumbCoords.top;
				// shiftX здесь не нужен, слайдер двигается только по вертикали

				var scrollbarCoords = getCoords( scrollbar );

				document.onmousemove = function( e )
				{
					// вычесть координату родителя, т.к. position: relative
					var newTop = e.pageY - shiftY - scrollbarCoords.top;

					// курсор ушёл вне слайдера
					if ( newTop < 0 )
					{
						newTop = 0;
					}
					var bottomEdge = scrollbar.offsetHeight - thumbElem.offsetHeight;
					if ( newTop > bottomEdge )
					{
						newTop = bottomEdge;
					}
					scrollbox.scrollTop = newTop * ratio;
					thumbElem.style.top = newTop + 'px';
				}

				document.onmouseup = function()
				{
					mouseup               = true;
					_mouseOnChat          = false;
					clearTimeout(_chatTimeout);
					_chatTimeout          = setTimeout( function()
					{
						if ( !_mouseOnChat )
						{
							_chatParent.className = "";
							_scrollbar.toTop();
						}
					}, 350 )
					scrollbar.onmousedown = function( e )
					{
						var scrollbarCoords = getCoords( scrollbar );
						var newTop          = e.pageY - scrollbarCoords.top;
						var bottomEdge      = scrollbar.offsetHeight - thumbElem.offsetHeight;
						if ( newTop > bottomEdge )
						{
							newTop = bottomEdge;
						}
						scrollbox.scrollTop = newTop * ratio;
						thumbElem.style.top = newTop + "px";
					}
					document.onmousemove  = document.onmouseup = null;
				};

				return false; // disable selection start (cursor change)
			};

			scrollbox.onscroll = function()
			{
				thumbElem.style.top = scrollbox.scrollTop / ratio + "px";
			}

			thumbElem.ondragstart = function()
			{
				return false;
			};

			o.toTop = function()
			{
				scrollbox.scrollTop = 0;
			}
		}
		function getCoords( elem )
		{
			var box = elem.getBoundingClientRect();

			return {
				top  : box.top + pageYOffset,
				left : box.left + pageXOffset
			};

		}

		return o;
	}

	_scrollbar = scrollbarTop( _chatParent );

	//SPECIAL
	this.outputSystemMessage = function( message, className )
	{
		var div         = document.createElement( 'div' );
		if (className) div.className = className;
		var chat        = document.getElementById( "chat" );
		div.textContent = message;
		chat.insertBefore( div, chat.firstChild );
		_scrollbar.init();
		setTimeout( function()
		{
			animate( function( timePassed )
			{
				div.style.opacity = 1 - timePassed / 3000;
			}, 3000 );
		}, 7000 );
	};

	// Рисует функция draw
	// Продолжительность анимации duration
	function animate( draw, duration )
	{
		var start = performance.now();

		requestAnimationFrame( function animate( time )
		{
			// определить, сколько прошло времени с начала анимации
			var timePassed = time - start;

			// возможно небольшое превышение времени, в этом случае зафиксировать конец
			if ( timePassed > duration )
			{
				timePassed = duration;
			}

			// нарисовать состояние анимации в момент timePassed
			draw( timePassed );

			// если время анимации не закончилось - запланировать ещё кадр
			if ( timePassed < duration )
			{
				requestAnimationFrame( animate );
			}

		} );
	}
    
    _passwordCheck.onclick = function()
    {
        _passwordInput.className = "";
    }

    function copy(el)
    {
        el.focus();
        el.select();
        try 
        {
            if(document.execCommand('copy'))
            {
                el.style.backgroundColor = "gray";
                if ( el == _roomURLpass ) _showPass.style.backgroundColor = "gray";
                setTimeout(function()
                {
                    el.removeAttribute("style");
                    _showPass.removeAttribute("style");
                },100);
            }
            else
                console.log("Ошибка при копировании");
        } 
        catch(err) {console.log("Ошибка при копировании");}
        el.blur();
    }
    _copyURL.onclick = function()
    {
        copy(_roomURLtext);
    } 
    _copyPass.onclick = function()
    {
        copy(_roomURLpass);
    }
    
    function selectText(event)
    {
        event.target.focus();
        event.target.select();
    }
    _roomURLtext.onclick = selectText;    
    _roomURLpass.onclick = selectText;    
    
	_generateId.onclick = function()
	{
		__peerController.getRoomID( function( id )
		{
			_roomIdInput.value = id;
            _roomIdInput.className = "";
            _wrongId.className = "fakeClose";
		}, function( err )
		{
			alert( "Ошибка получения идентификатора комнаты\n" + err.toString() );
			location.reload();
		} )
	}
    _generatePass.onclick = function()
	{
        _passwordInput.className = "";
        _passwordInput.value = " ";
        setTimeout(function(){_passwordInput.value = Math.random().toString( 36 ).substr( 2, 6 );},30)
	}
    
    _passwordInput.onblur = _roomIdInput.onblur = _inputLink.onblur = _nick.onblur = function(event)
    {
        if (event.target.value !== "") event.target.className = "";
    }
    _localURL.onchange = function()
    {
        _localURL.className = "";
    }

	//what -- peerController.sending enum
	//from -- peerID
	//GENERIC

	function newPeerSrc( peerId, data )
	{
		_peers[ peerId ][ _peerVars.VIDEO_SRC ] = data;
		var opt                                 = document.querySelector( "#peersSrc option[data-peer='" + peerId + "']" );
		var newopt                              = opt ? false : true;
		if ( newopt ) // создать элемент если его не было
		{
			opt              = document.createElement( "option" );
			opt.dataset.peer = peerId;
		}
		opt.dataset.type = data[ 0 ];

		if ( data[ 0 ] === "" )
		{
			opt.value     = "";
			opt.disabled  = true;
			opt.innerHTML = _peers[ peerId ][ _peerVars.NICK ] + " - источник не выбран";
		}
		else if ( data[ 0 ] !== "localURL" )
		{
			opt.value     = data[ 1 ];
			opt.innerHTML = _peers[ peerId ][ _peerVars.NICK ] + " - " + data[ 1 ];
			if ( !newopt ) // если элемент уже существовал, то при необходимости убрать disableb и при слежение за пиром изменить viseo_src
			{
				if ( opt.disabled )
				{
					opt.disabled = false;
				}
				if (_session.video_info == peerId )
				{
					if ( _follow.checked && _videoSrcTabs == "peers")
					{
                        if (_session.video_src != data[1])
                        {
                            _session.type_src  = data[0];
                            _session.video_src = data[1];
                            _videoSrcChange    = true;
                            enterRoom();
                        }
					}
					else
					{
						document.querySelector( "span[data-type='inputLink']" ).click();
						_inputLink.value = _session.video_src;
						_session.video_info = "";
					}
				}
			}
		}
		else
		{
			opt.value     = "";
			opt.disabled  = true;
			opt.innerHTML = _peers[ peerId ][ _peerVars.NICK ] + " - локальный файл";
			if(_session.video_info === peerId)
			{
				_inputLink.value = _session.video_src;
				if (!_follow.checked)
				{
					document.querySelector( "span[data-type='inputLink']" ).click();
					_session.video_info = "";
				}
			}
		}
		if ( newopt )
		{
			_peersSrc.appendChild( opt );
		}
	}
    
    this.getNickFromID = function(id)
    {
        return id ? _peers[ id ][ _peerVars.NICK ] : _session.nick;
    }

	this.onRecieved = function( what, from, data )
	{
		switch ( what )
		{
			case __peerController.sending.MESSAGE:
				formMessage( data );
				break;
			case __peerController.sending.DATA_SOURCE:
				newPeerSrc( from, data );
				break;
			case __peerController.sending.NICK:
				_self.outputSystemMessage( _peers[ from ][ _peerVars.NICK ] + " теперь известен как " + data );
				_peers[ from ][ _peerVars.NICK ]               = data;
				_peers[ from ][ _peerVars.ROW ][ 1 ].innerHTML = data;
                
                var opt = document.querySelector( "#peersSrc option[data-peer='" + from + "']" );
                if ( _peers[ from ][ _peerVars.VIDEO_SRC ][0] === "" )
                {
                    opt.innerHTML = data + " - источник не выбран";
                }
                else if ( _peers[ from ][ _peerVars.VIDEO_SRC ][0] !== "localURL" )
                {
                    opt.innerHTML = data + " - " + _peers[ from ][_peerVars.VIDEO_SRC][1];
                }
                else
                {
                    opt.innerHTML = data + " - локальный файл";
                }
				break;
			case __peerController.sending.INITIAL_INFO:
				_self.outputSystemMessage( "В комнату зашел " + data[ 0 ] );
				_peers[ from ][ _peerVars.NICK ]               = data[ 0 ];
				_peers[ from ][ _peerVars.ROW ][ 1 ].innerHTML = data[ 0 ];
				newPeerSrc( from, data[ 1 ] );
				break;
			default:
				alert( "elementsController.onRecieved: unrecognized 'what'" );
		}
	};

	_peerListButton.onclick = function()
	{
		if ( _peerListParent.className != "show" )
		{
			_peerListParent.className = "show";
		} else
		{
			_peerListParent.className = "hidden";
		}
        _peerListButton.blur();
	}

	this.onPeerConnected = function( peerId )
	{
		if ( !_peerTable.children[ 0 ] )
		{
			_noteEmptyRoom.innerHTML = "";
		}
		_peers [ peerId ]                      = [];
		_peers[ peerId ][ _peerVars.ROW ]      = [];
		_peers[ peerId ][ _peerVars.ROW ][ 0 ] = document.createElement( "tr" );
		_peerTable.appendChild( _peers[ peerId ][ _peerVars.ROW ][ 0 ] );
		_peers[ peerId ][ _peerVars.ROW ][ 1 ] = document.createElement( "td" );
		_peers[ peerId ][ _peerVars.ROW ][ 0 ].appendChild( _peers[ peerId ][ _peerVars.ROW ][ 1 ] );
		_peers[ peerId ][ _peerVars.ROW ][ 2 ] = document.createElement( "td" );
		_peers[ peerId ][ _peerVars.ROW ][ 0 ].appendChild( _peers[ peerId ][ _peerVars.ROW ][ 2 ] );
	}

	//SINGLE GET
	this.getInitialData = function()
	{
		return ([ _session.nick, [ _session.type_src, _session.video_src ] ]);
	};

	//SPECIAL
	this.onPeerDeleted = function( id )
	{
		_self.outputSystemMessage( _peers[ id ][ _peerVars.NICK ] + " вышел" );
		if ( _peers[ id ] )
		{
			if ( _peers[ id ][ _peerVars.AUDIO ] )
			{
				_peers[ id ][ _peerVars.AUDIO ].remove();
			}
			if ( _peers[ id ][ _peerVars.RANGE ] )
			{
				_peers[ id ][ _peerVars.RANGE ].remove();
			}
			if ( _peers[ id ][ _peerVars.ROW ][ 0 ] )
			{
				_peers[ id ][ _peerVars.ROW ][ 0 ].remove();
			}
			document.querySelector( "#peersSrc option[data-peer='" + id + "']" ).remove();
			delete _peers[ id ];
			if(_session.video_info === id)
			{
				document.querySelector( "span[data-type='inputLink']" ).click();
				_inputLink.value = _session.video_src;
				_session.video_info = "";
			}
			if ( !_peerTable.children[ 0 ] )
			{
				_noteEmptyRoom.innerHTML = "&#160;Кроме вас в комнате никого нет&#160;";
			}
		}
	};

	this.onPeerLeavedVoiceChat = function( id )
	{
		if ( _peers[ id ] )
		{
			if ( _peers[ id ][ _peerVars.AUDIO ] )
			{
				_peers[ id ][ _peerVars.AUDIO ].remove();
			}
			if ( _peers[ id ][ _peerVars.RANGE ] )
			{
				_peers[ id ][ _peerVars.RANGE ].remove();
			}
			_peers[ id ][ _peerVars.ROW ][ 2 ].innerHTML = '';
			_peers[ id ][ _peerVars.ROW ][ 1 ].className = '';
		}
	};

	this.onPeerJoinedVoiceChat = function( peer )
	{
		_peers[ peer ][ _peerVars.ROW ][ 1 ].className = "green";
	};

	this.onGotAudioStream = function( peer, audioStream )
	{
		_peers[ peer ][ _peerVars.AUDIO ]          = document.createElement( "audio" );
		_peers[ peer ][ _peerVars.AUDIO ].src      = (URL || webkitURL || mozURL).createObjectURL( audioStream );
		_peers[ peer ][ _peerVars.AUDIO ].autoplay = "autoplay";
		_peers[ peer ][ _peerVars.MUTED ]          = false;

		var img                  = document.createElement( "img" );
		img.style                = "width : 20px;";
		img.src                  = "/volume.svg";
		img.style.verticalAlign  = "bottom";
        
		img.onclick = function( event )
		{
			mute( _peers[ peer ][ _peerVars.MUTED ], event.target, _peers[ peer ][ _peerVars.AUDIO ] );
			_peers[ peer ][ _peerVars.MUTED ] = !_peers[ peer ][ _peerVars.MUTED ];
		};
		_peers[ peer ][ _peerVars.ROW ][ 2 ].innerHTML = '';
		_peers[ peer ][ _peerVars.ROW ][ 2 ].appendChild( img );

		_peers[ peer ][ _peerVars.RANGE ]           = document.createElement( "input" );
		_peers[ peer ][ _peerVars.RANGE ].type      = "range";
		_peers[ peer ][ _peerVars.RANGE ].className = "volume volume_crutch";
		_peers[ peer ][ _peerVars.RANGE ].id        = "range_" + peer;
		_peers[ peer ][ _peerVars.RANGE ].value     = "1";
		_peers[ peer ][ _peerVars.RANGE ].min       = "0";
		_peers[ peer ][ _peerVars.RANGE ].max       = "1";
		_peers[ peer ][ _peerVars.RANGE ].step      = "0.01";
		_peers[ peer ][ _peerVars.RANGE ].oninput   = function( event )
		{
			_peers[ peer ][ _peerVars.AUDIO ].volume = event.target.value;
		};
		_peers[ peer ][ _peerVars.ROW ][ 2 ].appendChild( _peers[ peer ][ _peerVars.RANGE ] );
	};

	// Get audioStream
	function getAndSendAudioStream()
	{
		console.log( "getAndSendAudioStream" );
		navigator.getUserMedia = (
		navigator.getUserMedia ||
		navigator.webkitGetUserMedia ||
		navigator.mozGetUserMedia ||
		navigator.msGetUserMedia);

		var send = function( audio )
		{
			console.log( "Sending audioStream" );
			__peerController.joinVoiceChat( audio );
			_audioStream = audio;
		};

		var constraints = { video : false, audio : true };
		var success     = function( audioStream )
		{
			console.log( 'Successfully got the audioStream' );
			send( audioStream );
		};
		var error       = function( err )
		{
			console.error( err.toString() );
			console.log( 'Couldn\'t get the audioStream' );
			send( null );
		};
		if ( navigator.mediaDevices.getUserMedia )
		{
			var media = navigator.mediaDevices.getUserMedia( constraints );
			media.then( success );
			media.catch( error );
		}
		else if ( navigator.getUserMedia )
		{
			navigator.getUserMedia( constraints, success, error );
		}
		else
		{
			error( new Error( '*.getUserMedia is unsupported' ) );
		}
	}
    
    function joinButtonClick(func)
    {
        if (func)
            _overlay.onmousedown = function(event)
            {
                if(event.target==_overlay||event.target==_joinButton) 
                    _overlay.onmouseup = function(event)
                    {
                        func();
                        _overlay.onmouseup = "";
                    }
            }
        else
            _overlay.onmousedown = "";
    }
    
    _showPass.onclick = function()
    {
        _showPass.className = "close";
    }
    
    function showRoomDate()
    {
        _roomURLtext.value = location.hostname+location.pathname+location.search+location.hash;
        if (_passwordInput.value)
        {
            _roomURLpassArea.className = "";
            _roomURLpass.value = _passwordInput.value;
        }
        else if (_session.password)
        {
            _roomURLpassArea.className = "";
            _roomURLpass.value = _session.password;
        }
        else
            _roomURLpassArea.className = "close";
    }

	function error404()
	{
		_session.clear();
		_joinButton.value   = "Создать эту комнату";
		_title.innerHTML    = "Ошибка 404";
		_roomIdInput.value  = window.location.hash.substr( 1 );
		joinButtonClick(function()
		{
			_passwordInput.value = "";
			window.location.hash = "";
			_title.innerHTML     = "Создание комнаты";
			joinButtonClick(createRoom);
			_overlay.className   = "create";
		});
		_overlay.className  = "error";
	}

	function error406()
	{
		_session.clear();
		_joinButton.value   = "Создать комнату";
		_title.innerHTML    = "Это не та комната";
		joinButtonClick(function()
		{
			window.location.hash = "";
			init();
		});
		_overlay.className  = "error";
	}

	function connectionProblems()
	{
		_self.outputSystemMessage( "Подключение выполняется дольше обычного" );
	}

	function joinRoomError( err )
	{
		alert( "Ошибка при подключении к комнате\n" + err.toString() );
		location.reload();
	}

	function joinRoomWithPassword()
	{
		_wrongPassword.className = "fakeClose"; //закрыть надпись о неверном пароле
		__peerController.joinRoom( window.location.hash.substr( 1 ), _passwordInput.value, [ __peerController.responses.JOINED ], enterRoom, connectionProblems,
			function( response )//unexpected response
			{
				if ( response === __peerController.responses.WRONG_PASSWORD )
				{
					_wrongPassword.className = ""; //вывод надписи о неверном пароле

				}
				else if ( response === __peerController.responses.CREATED )
				{
					error404();
				} else
				{
					__peerController.dropAllConnections( start );
				}
			}, joinRoomError )
	}

	function createRoom()
	{
        var good = true;
		_wrongId.className = "fakeClose"; //закрыть надпись о неверном idRoom
        _roomIdInput.className = "";
        _inputLink.className = "";
        _localURL.className = "";
        _passwordInput.className = "";
        _nick.className = "";
        
        if ( _roomIdInput.value == "" )
        {
            _roomIdInput.className = "redBorders";
            good = false;
        }
        
        if ( _nick.value == "" )
        {
            _nick.className = "redBorders";
            good = false;
        }
        
        if ( _videoSrcTabs == "inputLink" )
		{
			if ( _inputLink.value == "" ) 
            {
                _inputLink.className = "redBorders";
                good = false;
            }
        }
        else
        {
            if ( _localURL.value == "" ) 
            {
                _localURL.className = "redBorders";
                good = false;
            }
        }
        
        if ( _passwordCheck.checked ) 
        {
            if ( _passwordInput.value == "" )
            {
                _passwordInput.className = "redBorders";
                good = false;
            }
        }
        else _passwordInput.value = "";
        
        if (good == false) return;
        
        processInputs();
		__peerController.joinRoom( _roomIdInput.value, _passwordInput.value, [ __peerController.responses.CREATED ], 
            function(roomId)
            {
                _joinButton.onclick = "";
                _session.room_id     = roomId;
                window.location.hash = '#' + roomId;
                _wrongId.className   = "fakeClose";
                showRoomDate();
                _overlay.className   = "copy";
                _title.innerHTML     = "Комната создана";
                _joinButton.value    = "Закрыть"
                joinButtonClick(enterRoom);
            }, connectionProblems,
            function()//unexpected response
            {
                _wrongId.className = ""; //вывод надписи о неверном idRoom
            }, joinRoomError )
	}

	function processInputs() //здесь происходит изменение сессии (не инициализация)
	{
		if ( _nick.value !== _session.nick )
		{
            if (_nick.value == "") 
            {
                _nick.value = _session.nick;
            }
            else
            {
                _session.nick = _nick.value;
                __peerController.send( __peerController.sending.NICK, _session.nick );//sending on creation/joining/return. sending on creation does nothing.
            }
		}
		if ( _session.password !== _passwordInput.value && _passwordInput.value !== '' )
		{
			_session.password = _passwordInput.value;
		}
        
        var deleteTorrent = _torrent;
		if ( _videoSrcTabs == "inputLink" )
		{
			if ( _inputLink.value !== "") 
            {
                if( _session.video_src !== _inputLink.value )
                {
                    _videoSrcChange     = true;
                    _inputLink.value    = _inputLink.value.trim();
                    _session.video_src  = _inputLink.value;
                    _session.video_info = "";
                    if ( _inputLink.value.indexOf( "magnet:?" ) === 0 )
                    {
                        _session.type_src = "magnet";
                    }
                    else if ( _inputLink.value.indexOf( "pull:" ) === 0 )
                    {
                        _session.type_src = "youtubeID_direct";
                    }
                    else if ( parseYoutubeLinkIntoID( _inputLink.value ) )
                    {
                        _session.type_src = "youtubeID_embedded";
                    }
                    else
                    {
                        _session.type_src = "globalURL";
                    }
                }
            }
            else
            {
                _inputLink.value = _session.video_src;
            }
		}
		else if ( _videoSrcTabs == "localURL" )
		{
			if ( _localURL.files[ 0 ] )
			{
				if ( _localURL.files[ 0 ].lastModified != _session.video_info[ 0 ] || _localURL.files[ 0 ].size != _session.video_info[ 1 ] )
				{
					_session.video_src  = (URL || webkitURL || mozURL).createObjectURL( _localURL.files[ 0 ] );
					_session.video_info = [ _localURL.files[ 0 ].lastModified, _localURL.files[ 0 ].size ];
					_session.type_src   = "localURL";
					_videoSrcChange     = true;
                    
                    if (_seedLocal.checked)
                    {
                        if (!_client) _client = new WebTorrent();
                        _client.seed(_localURL.files[0], function (torrent) 
                        {
                            _torrent = torrent;
                            __peerController.send( __peerController.sending.DATA_SOURCE, [ "magnet", torrent.magnetURI ] );
                        })
                    }
				}
			}
		}
		else
		{
			if ( _peersSrc.value && ( _session.video_src !== _peersSrc.value || _session.video_info === "" ) )
			{
				var data = document.querySelector( "#peersSrc option:checked" );
				if ( _session.video_src !== _peersSrc.value )
				{
					_videoSrcChange = true;
				}
				_session.video_src  = _peersSrc.value;
				_session.type_src   = data.dataset.type;
				_session.video_info = data.dataset.peer;
			}
		}

		if ( _videoSrcChange || ( _torrent && !_seedLocal.checked )) //creation/joining/return. even local sources (to tell that to other peers)
		{
			__peerController.send( __peerController.sending.DATA_SOURCE, [ _session.type_src, _session.video_src ] );
            if (deleteTorrent)
            {
                if ( _seedLocal.checked && _session.type_src == "localURL" )
                {
                    _client.remove(deleteTorrent);
                }
                else if(_session.type_src == "magnet")
                {
                    _client.remove(_torrent);
                    _torrent = null;
                }
                else
                {
                    _client.destroy();
                    _client  = null;
                    _torrent = null;
                }
            }
		}
		if ( _session.audiochat_status != _audioChatStatus.checked )
		{
			_session.audiochat_status = _audioChatStatus.checked;
		}
	}

	function enterRoom( roomId )
	{
		if ( roomId )
		{
			_session.room_id = roomId;
			if ( window.location.hash === '' )
			{
				window.location.hash = '#' + roomId;
			}
            
			_wrongPassword.className = "fakeClose";
			_wrongId.className       = "fakeClose";
            
            showRoomDate();
            
            _audioChatStatus.checked = (_session.audiochat_status=="true")?true:false;
		}
        

		if ( _session.video_src === '' )
		{
			var enabledOption  = document.querySelector( "#peersSrc option:not(:disabled)" );
			var disabledOption = document.querySelector( "#peersSrc option:disabled" );
			if ( enabledOption )
			{
				document.querySelector( "span[data-type='peers']" ).click();
				_peersSrc.value = enabledOption.value;
			}
			else if ( disabledOption )
			{
				document.querySelector( "span[data-type='localURL']" ).click();
			}
            
            if (document.querySelector( "#peersSrc option:checked" ))
            {
                inputAndEnter();
            }
            else
            {
                joinButtonClick(inputAndEnter);
                _joinButton.value   = "Войти в комнату";
                _title.innerHTML    = "";
                _overlay.className  = "join";
            }
		}
		else
		{
			if ( _videoSrcChange )
			{
				_videoSrcChange = false;

				if ( _session.type_src === "globalURL" || _session.type_src === 'localURL' )
				{
					constructVideoContent_directSource( _session.video_src );
				}
				else if ( _session.type_src === 'magnet' )
				{
					constructVideoContent_webtorrentMagnet( _session.video_src );
				}
				else if ( _session.type_src === 'youtubeID_embedded' )
				{
					constructVideoContent_youtubeIframe( _session.video_src );
				}
				else if ( _session.type_src === 'youtubeID_direct' )
				{
					constructVideoContent_youtubeDirect( _session.video_src );
				}
				else
				{
					alert( "Unrecognized type_src" );
				}
			}

			//аудио-чат
			if ( _session.audiochat_status == "true")
			{
				if ( !(__peerController.get( __peerController.getting.JOINED_VOICE_CHAT )) )
				{
					getAndSendAudioStream();
				}
			}
			else if ( __peerController.get( __peerController.getting.JOINED_VOICE_CHAT ) )
			{
				__peerController.leaveVoiceChat();
				if ( _audioStream !== null )
				{
					_audioStream.getAudioTracks()[ 0 ].stop();
				}
				for ( var id in _peers )
				{
					_self.onPeerLeavedVoiceChat( id );
				}
			}

			//отображение плеера
            if (_joinButton.value != "Вернуться")
            {
                joinButtonClick(inputAndEnter);
                _joinButton.value   = "Вернуться";
                _title.innerHTML    = "";
            }
			_overlay.className  = "close";
            _showPass.className = "";
		}
	}
    function inputAndEnter()
    {
        processInputs();
        enterRoom();
    }

	function init( id )
	{
		_muteVideo      = false;
		_audioStream    = null;
		_videoSrcChange = true;
		_videoLoaded    = false;
		if ( id )
		{
			if ( !_session.nick )
			{
				_session.nick = id.replace(/[^a-z]+/g, '').substr(0,6);
                if (_session.nick == "") _session.nick = id.substr(0,6);
			} 
            _nick.value = _session.nick;
		}
		if ( _session.type_src !== '' )
		{
			if ( _session.type_src !== 'localURL' )
			{
				_inputLink.value = _session.video_src;
				document.querySelector( "span[data-type='inputLink']" ).click();
			}
			else
			{
				document.querySelector( "span[data-type='localURL']" ).click();
			}

		}

		constructVideoContent_dummy();
		if ( window.location.hash === '' )
		{
			__peerController.getRoomID( function( potentialRoomID )
			{
				_session.clear();
				_passwordInput.value = "";
				_joinButton.value    = "Создать комнату";
				_roomIdInput.value   = potentialRoomID;
				_title.innerHTML     = "Создание комнаты";
				_joinButton.onclick  = createRoom;
				_overlay.className   = "create";
			}, function( err )
			{
				alert( "Ошибка получения идентификатора комнаты\n" + err.toString() );
				location.reload();
			} );
		}
		else
		{
			if ( _session.room_id === window.location.hash.substr( 1 ) )
			{
				_session.video_info = "";
				__peerController.joinRoom( _session.room_id, _session.password, [
						__peerController.responses.JOINED,
						__peerController.responses.CREATED
					], enterRoom, connectionProblems,
					function( response )//unexpected response
					{
						if ( response === __peerController.responses.WRONG_PASSWORD )
						{
							error406();
						} else
						{
							__peerController.dropAllConnections( start );
						}
					}, joinRoomError )
			}
			else
			{
				_session.clear();
				var desiredRoomID = window.location.hash.substr( 1 );
				__peerController.getRoomStatus( desiredRoomID, function( status )
				{
					if ( status === __peerController.responses.PUBLIC_ROOM )
					{
						__peerController.joinRoom( desiredRoomID, '', [ __peerController.responses.JOINED ], enterRoom, connectionProblems,
							function( response )//unexpected response
							{
								if ( response === __peerController.responses.WRONG_PASSWORD )
								{
									error406();
								} else if ( response === __peerController.responses.CREATED )
								{
									error404();
								} else
								{
									__peerController.dropAllConnections( start );
								}
							}, joinRoomError )
					}
					else if ( status === __peerController.responses.PRIVATE_ROOM )
					{
						_title.innerHTML    = "Введите пароль";
						joinButtonClick(joinRoomWithPassword);
						_joinButton.value   = "Войти в комнату";
						_overlay.className  = "password";
					}
					else
					{
						error404();
					}
				}, function( err )
				{
					alert( "Не удалось получить статус комнаты\n" + err.toString() );
					location.reload();
				} )
			}
		}
	}

    _session = new Object;
    Object.defineProperties( _session, 
    {
		//"nick":             {set:function(n){localStorage.wtsplayer_nick=n;},               get:function(){return localStorage.wtsplayer_nick;}},
		"nick":             {set:function(n){sessionStorage.wtsplayer_nick=n;},             get:function(){return sessionStorage.wtsplayer_nick;}},
		"password":         {set:function(n){sessionStorage.wtsplayer_password=n;},         get:function(){return sessionStorage.wtsplayer_password;}},
		"room_id":          {set:function(n){sessionStorage.wtsplayer_room_id=n;},          get:function(){return sessionStorage.wtsplayer_room_id;}},
		"type_src":         {set:function(n){sessionStorage.wtsplayer_type_src=n;},         get:function(){return sessionStorage.wtsplayer_type_src;}},
		"video_src":        {set:function(n){sessionStorage.wtsplayer_video_src=n;},        get:function(){return sessionStorage.wtsplayer_video_src;}},
		"video_info":       {set:function(n){sessionStorage.wtsplayer_video_info=n;},       get:function(){return sessionStorage.wtsplayer_video_info;}},
		"audiochat_status": {set:function(n){sessionStorage.wtsplayer_audiochat_status=n;}, get:function(){return sessionStorage.wtsplayer_audiochat_status;}}
	});
    _session.clear = function()
	{
		_session.room_id    = "";
		_session.password   = "";
		_session.type_src   = "";
		_session.video_src  = "";
		_session.video_info = "";
	};
    if (!_session.room_id)
    {  
		_session.clear();
		_session.audiochat_status = "false";
	}
	
	function tabs()
	{
		var a = document.querySelectorAll( ".korpus1 > span" );
		for ( var i = a.length - 1; i >= 0; i-- )
		{
			a[ i ].onclick = function()
			{
				var n = parseInt( this.dataset.num );
				_videoSrcTabs = this.dataset.type;
				document.querySelector( ".korpus1 div:nth-of-type(" + n + ")" ).style.visibility = "visible";
				for ( var j = n + 1; j <= a.length; j++ )
				{
					document.querySelector( ".korpus1 div:nth-of-type(" + j + ")" ).style.visibility = "hidden";
				}
			};
		}
	};
	tabs();

	function start()
	{
		clear();
        if(document.execCommand) _roomURL.className = "widthCopy";
		__peerController.connectToServer( init, function( err, isNotFatal )
		{
			if ( _noReload )
			{
				var message = "Ошибка сети: " + err.toString();
				if (isNotFatal)
				{
					_self.outputSystemMessage("Возможны проблемы с подключением...");
				}
				else
				{
					alert( message );
					location.reload();
				}
			}
		} );
	}

	window.onbeforeunload = function()
	{
		_noReload = false;
	};

	function clear()
	{
		_inputLink.value             = "http://www.youtube.com/watch?v=c6rP-YP4c5I";
		_localURL.value              = "";
		_peersSrc.innerHTML          = "";
		_muteVideo                   = false;
		_volume.value                = 1;
		_volumeButton.src            = "volume.svg";
		_seekRange.value             = 0;
		_currentTimeOutput.innerHTML = "00:00";
		_videoSrcTabs                = 'inputLink';
	}

	window.onload = start;

	window.onhashchange = function()
	{
		var newHash = window.location.hash.substr( 1 );
		if ( newHash !== _session.room_id )
		{
            showPass.className = "";
			joinButtonClick();
			__peerController.fakeReload( function()
			{
				clear();
				init();
			}, location.reload );
		}
	};

	window.onresize = function()
	{
		_scrollbar.init();
	}

	function applyTheme()
	{
		if (_darkThemeCheckbox.checked)
		{
			_darkCSS.disabled = false;
		}
		else
		{
			_darkCSS.disabled = true;
		}
	}

	_darkThemeCheckbox.addEventListener('change', function()
	{
		applyTheme();
	});

	applyTheme();

	//Initializing _playPauseButton object
	switchToWaiting();

};
//TODO: make sure that everything deletes properly