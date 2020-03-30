/*
 The MIT License

 Copyright (c) 2016 Leonid Fenko aka Fen-ok <fenok2112@gmail.com>, Georgy Kosturov aka Geosins <geosins@yandex.ru>
 */

(function()
{
	var app =
		{
			peerController     : new wtsplayer.peerController(),
			stateController    : new wtsplayer.stateController(),
			elementsController : new wtsplayer.elementsController()
		};

	for ( var controllerName in app )
	{
		for ( var externalControllerName in app[ controllerName ].externals )
		{
			for ( var method in app[ controllerName ].externals[ externalControllerName ] )
			{
				app[ controllerName ].externals[ externalControllerName ][ method ] = app[ externalControllerName ][ method ];
			}
		}
	}
})();