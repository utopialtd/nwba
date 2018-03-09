/* running modes */
var onlinemode=false;
var show_about_onstart=false;
var show_promotions_onstart=true;
var show_qr_code=true;
var force_load_all=true;
var maps_loaded=false;
var starting_up=true;

// Force init
//localStorage.clear();
//localStorage.setItem('region','');


/* app instance */
var api_base_url='http://www.northwestcountry.co.nz/buylocal/appapi/index.php?';
var app_terms='http://www.northwestcountry.co.nz/nwapprules';
var app_map_center = {lat: -36.7768944, lng: 174.558682};

var api_url='';
var management_guid='105ec886-b0ba-4edd-b1cf-2d703b5e24c0';
var app_name='Buy Local Northwest';
var version_api='201703261312';
var ajax_split_row='|';
var ajax_split_col='^';

/* security */
var session='';

/* What is being shown / selected */
var header_visible=false;
var logged_in=false;
var promotion_slides = [];
var about_slides = [];
var regions = [];
var categories = [];
var map=null;
var map_watchid=null;
var map_current_position=null;
var map_markers = [];
var on_geolocation_centertome;

/* global variables */
var promotions_carousel = null;
var about_carousel = null;
var loading_timegap = 2;
var none = '(none)';

/* versions come back from website */
var version_listings = '';
var version_promotions = '';

/* screen firing */
function changeScreen( screen_div ){
	appLog( 'changeScreen '+screen_div );
	internalCloseAllNav( );
	actionMapDeinit( );
	switch( screen_div ){
		case '':					actionLoading( ); break;
		case 'about':				actionAbout( ); break;
		case 'tandc':				actionTandc( ); break;
		case 'promotions':			actionPromotions( ); break;
		case 'map':					actionMap( ); break;
		case 'mapme':				actionMapMe( ); break;
		case 'region':				actionRegion( ); break;
		case 'logout':				actionLogoutNow( false ); break;
		case 'login':				actionLogin( ); break;
		case 'loginfacebook':		actionLoginFacebook( ); break;
		case 'register':			actionRegister( ); break;
		case 'changepassword1':		actionChangePassword1( ); break;
		case 'changepassword2':		actionChangePassword2( ); break;
		case 'profile':				actionProfile( ); break;
		case 'welcomenewuser':		actionWelcomeNewUser( ); break;
		case 'scan':				actionScan( ); break;
		case 'scanfailed':			actionScanFailed( ); break;
		case 'scansuccess':			actionScanSuccess( ); break;
	}
	return false;
}
function afterAbout( ){
	if( show_promotions_onstart && promotion_slides.length > 0 ){
		actionPromotions( );
	} else {
		actionMap( );
	}
}
/* ------------- database --------------- */
var db;
var db_file='buylocal.db';
var db_schema='1.0';
function db_init( ){
	appLog( 'db_init' );
	var size=35*1024*1024;
	db = window.openDatabase( db_file, db_schema, 'Buylocal', size );
	// db = sqlitePlugin.openDatabase({name: db_file});
}
function db_exec( sql, data ){
	dbLog( "db: "+sql );
	db.transaction(function(tx){
		tx.executeSql(sql, data, function(tx, res) {
		}, function(e) {
			console.log("ERROR: " + e.message);
		});
	});
}
function db_create( type ){
	appLog( 'db_create '+type );
	if( type == 'promotion' ){
		db_exec( 'DROP TABLE IF EXISTS promotion', new Array()  );
		db_exec( 'CREATE TABLE IF NOT EXISTS promotion( guid TEXT PRIMARY KEY, url TEXT, image TEXT)', [] );
	} else if( type == 'region' ){
		db_exec( 'DROP TABLE IF EXISTS region', new Array()  );
		db_exec( 'CREATE TABLE IF NOT EXISTS region( guid TEXT PRIMARY KEY, name TEXT, description TEXT, image_url TEXT, longlat TEXT)', [] );
	} else if( type == 'category' ){
		db_exec( 'DROP TABLE IF EXISTS category', new Array()  );
		db_exec( 'CREATE TABLE IF NOT EXISTS category( guid TEXT PRIMARY KEY, name TEXT, icon TEXT)', [] );
	} else if( type == 'business' ){
		db_exec( 'DROP TABLE IF EXISTS business', new Array()  );
		db_exec( 'CREATE TABLE IF NOT EXISTS business( guid TEXT PRIMARY KEY, name TEXT, category_guid TEXT, region_guid TEXT, description TEXT, phone TEXT, address TEXT, hours TEXT, email TEXT, web_url TEXT, longlat TEXT)', [] );
	}
}

function db_select( sql, data, result_callback ){
	db.transaction(function(tx){
		tx.executeSql(sql, data, function(tx, res) {
			var result = [];
			for(var i=0; i < res.rows.length; i++) {
				result.push(res.rows.item(i));
			}
			result_callback(result);
		}, function(e) {
			console.log("ERROR: " + e.message);
		});
	});
}

/* ------------- loading --------------- */
function actionLoading( ){
	actionLoadingShow( 0 );
	appLog( 'actionLoading' );
	showScreen( 'loading' );
	setTimeout( actionLoadingAbout, loading_timegap  );
}
function actionLoadingShow( progress ){
	$('#loading .progressbar-done').width( progress+'%' );
}
function actionLoadingAbout( ){
	actionLoadingShow( 10 );
	appLog( 'actionLoadingAbout' );
	$.get('assets/about1.htm?'+getTimestamp(), function(data){
		about_slides[0]=data;
		$.get('assets/about2.htm?'+getTimestamp(), function(data){
			about_slides[1]=data;
			setTimeout( actionLoadingInfo, loading_timegap );
		});		
	});		
}

function actionLoadingInfo( ){
	actionLoadingShow( 20 );
	appLog( 'actionLoadingInfo' );
	if( localStorage.getItem( 'version_promotions' ) == null ) show_about_onstart=true;
	var xhttp = new XMLHttpRequest();
	xhttp.onreadystatechange = function() {
		if (this.readyState == 4 && this.status == 200) {
			info=this.responseText.split( ajax_split_row );
			var row=info[0].split( ajax_split_col );
			if( row[1] != version_api ){
				navigator.notification.alert( 'Please visit the App store and get an updated version of '+app_name, exitFromApp, 'Upgrade needed', 'Ok' )
			} else {
				session=row[2];
				api_url=api_base_url+'ds='+session+'&mg='+management_guid+'&';
				var row=info[1].split( ajax_split_col );
				version_listings=row[0];
				version_promotions=row[1];
				appLog( 'api='+version_api+' listings='+version_listings+' promotions='+version_promotions );
				if( force_load_all == true ){
					localStorage.setItem( 'version_listings', '' );
					localStorage.setItem( 'version_promotions', '' );
				}
				db_init( );
				setTimeout( actionLoadingPromotions1, loading_timegap );
			}
		}
	};
	url=api_base_url+'a=info&mg='+management_guid;
	appLog( 'fetch '+url );
	xhttp.open("GET", url, true);
	xhttp.send();
}

function actionLoadingPromotions1( ){
	actionLoadingShow( 30 );
	appLog( 'actionLoadingPromotions1' );
	var check_version=localStorage.getItem( 'version_promotions' );
	if( check_version != version_promotions ){
		localStorage.setItem( 'version_promotions', version_promotions );
		setTimeout( actionLoadingPromotions2, loading_timegap );
	} else {
		setTimeout( actionLoadingPromotions3, loading_timegap );
	}
}
function actionLoadingPromotions2( ){
	actionLoadingShow( 33 );
	appLog( 'actionLoadingPromotions2' );
	db_create( 'promotion' );
	var xhttp = new XMLHttpRequest();
	xhttp.onreadystatechange = function() {
		if (this.readyState == 4 && this.status == 200) {
			db_exec( 'DELETE FROM promotion' );
			promotions=this.responseText.split( ajax_split_row );
			for(i=1;i<promotions.length;i++){
				var row=promotions[i].split( ajax_split_col );
				db_exec( 'INSERT INTO promotion VALUES( ?,?,? )', [row[0],row[1],row[2] ] );
			}
			setTimeout( actionLoadingPromotions3, loading_timegap );
		}
	};
	url=api_url+'a=promotions';
	appLog( 'fetch '+url );
	xhttp.open("GET", url, true);
	xhttp.send();
}
function actionLoadingPromotions3( ){
	actionLoadingShow( 36 );
	appLog( 'actionLoadingPromotions3' );
	db_select( 'SELECT * FROM promotion', new Array(), function(rs){
		promotion_slides=new Array();
		for(i=0;i<rs.length;i++){
			promotion_slides[i]=rs[i];
		}
		setTimeout( actionLoadingBusinesses1, loading_timegap );
	});
}

function actionLoadingBusinesses1( ){
	actionLoadingShow( 40 );
	appLog( 'actionLoadingBusinesses1' );
	var check_version=localStorage.getItem( 'version_listings' );
	if( check_version != version_listings ){
		localStorage.setItem( 'version_listings', version_listings );
		setTimeout( actionLoadingBusinesses2, loading_timegap );
	} else {
		setTimeout( actionLoadingCategories2, loading_timegap );
	}
}
function actionLoadingBusinesses2( ){
	actionLoadingShow( 45 );
	appLog( 'actionLoadingBusinesses2' );
	db_create( 'business' );
	var xhttp = new XMLHttpRequest();
	xhttp.onreadystatechange = function() {
		if (this.readyState == 4 && this.status == 200) {
			db_exec( 'DELETE FROM business' );
			businesses=this.responseText.split( ajax_split_row );
			for(i=1;i<businesses.length;i++){
				var row=businesses[i].split( ajax_split_col );
				db_exec( 'INSERT INTO business VALUES(?,?,?,?,?,?,?,?,?,?,?)', [row[0],row[1],row[2],row[3],row[4],row[5],row[6],row[7],row[8],row[9],row[10] ] );
			}
			setTimeout( actionLoadingCategories1, loading_timegap );
		}
	};
	url=api_url+'a=businesses';
	appLog( 'fetch '+url );
	xhttp.open("GET", url, true);
	xhttp.send();
}

function actionLoadingCategories1( ){
	actionLoadingShow( 50 );
	appLog( 'actionLoadingCategories1' );
	db_create( 'category' );
	var xhttp = new XMLHttpRequest();
	xhttp.onreadystatechange = function() {
		if (this.readyState == 4 && this.status == 200) {
			db_exec( 'DELETE FROM category' );
			db_exec( 'INSERT INTO category VALUES( ?,?,?)', ['all','All','' ] );
			categories=this.responseText.split( ajax_split_row );
			for(i=1;i<categories.length;i++){
				var row=categories[i].split( ajax_split_col );
				db_exec( 'INSERT INTO category VALUES( ?,?,?)', [row[0],row[1],row[2] ] );
			}
			setTimeout( actionLoadingRegions1, loading_timegap );
		}
	};
	url=api_url+'a=categories';
	appLog( 'fetch '+url );
	xhttp.open("GET", url, true);
	xhttp.send();
}
function actionLoadingRegions1( ){
	actionLoadingShow( 60 );
	appLog( 'actionLoadingRegions1' );
	db_create( 'region' );
	var xhttp = new XMLHttpRequest();
	xhttp.onreadystatechange = function() {
		if (this.readyState == 4 && this.status == 200) {
			db_exec( 'DELETE FROM region' );
			regions=this.responseText.split( ajax_split_row );
			for(i=1;i<regions.length;i++){
				var row=regions[i].split( ajax_split_col );
				db_exec( 'INSERT INTO region VALUES( ?,?,?,?,? )', [row[0],row[1],row[2],row[3],row[4] ] );
			}
			setTimeout( actionLoadingCategories2, loading_timegap );
		}
	};
	url=api_url+'a=regions';
	appLog( 'fetch '+url );
	xhttp.open("GET", url, true);
	xhttp.send();
}

function actionLoadingCategories2( ){
	actionLoadingShow( 70 );
	appLog( 'actionLoadingCategories2' );
	db_select( 'SELECT * FROM category', new Array(), function(rs){
		appLog( 'returned num='+rs.length );
		categories=new Array();
		var current_category = localStorage.getItem('category');
		var current_category_name = localStorage.getItem('category_name');
		for(i=0;i<rs.length;i++){
			appLog( 'cat i='+i );
			if( current_category == null ){
				current_category=rs[i].guid;
				current_category_name=rs[i].name;
			}
			categories[i]=rs[i];
		}
		localStorage.setItem( 'category', current_category );
		localStorage.setItem( 'category_name', current_category_name );
		setTimeout( actionLoadingRegions2, loading_timegap );
	});
}

function actionLoadingRegions2( ){
	actionLoadingShow( 80 );
	appLog( 'actionLoadingRegions2' );
	db_select( 'SELECT * FROM region', new Array(), function(rs){
		regions=new Array();
//		var current_region = localStorage.getItem('region');
//		var current_region_name = localStorage.getItem('region_name');
		for(i=0;i<rs.length;i++){
/*
			if( current_region == null ){
				current_region=rs[i].guid;
				current_region_name=rs[i].name;
			}
*/			
			regions[i]=rs[i];
		}
//		localStorage.setItem( 'region', current_region );
//		localStorage.setItem( 'region_name', current_region_name );
		setTimeout( actionLoadingLogin, loading_timegap );
	});
}

function actionLoadingLogin( ){
	actionLoadingShow( 90 );
	appLog( 'actionLoadingEnd1' );
	var u=localStorage.getItem( 'u' );
	var p=localStorage.getItem( 'p' );
	if( u == '' || u == null ){
		// No login
		logged_in=false;
		setTimeout( actionLoadingEnd, loading_timegap );
	} else {
		$.post( api_base_url, {
			a: 'login', ds: session, mg: management_guid,
			u: u,
			p: p
		},
		function( data, status ){
			register=data.split( ajax_split_row );
			var row=register[1].split( ajax_split_col );
			if( row[0] != '' ){
				actionLogoutNow( true );
			} else {
				actionLoginNow( u,p,row[1],'' );
			}
			setTimeout( actionLoadingEnd, loading_timegap );
		});
	}
}

function actionLoadingEnd( ){
	actionLoadingShow( 100 );
	appLog( 'actionLoadingEnd' );
	redraw();
	starting_up=false;
	if( show_about_onstart ){
		actionAbout( );
	} else {
		header_visible=true;
		$('header').show();
		$('footer').show();
		if( show_promotions_onstart && promotion_slides.length > 0 ){
			actionPromotions( );
		} else {
			actionMap( );
		}
	}
}
function internalToggleNav( nav_divid ){
	if( $('#'+nav_divid).is(':visible') ){
		hideSomething( '#'+nav_divid );
	} else {
		showSomething( '#'+nav_divid );
	}
	if( nav_divid != 'topnav' && $('#topnav').is(':visible') ) hideSomething( '#topnav' );
	if( nav_divid != 'regionnav' && $('#regionnav').is(':visible') ) hideSomething( '#regionnav' );
	if( nav_divid != 'categorynav' && $('#categorynav').is(':visible') ) hideSomething( '#categorynav' );
}
function internalCloseAllNav( ){
	if( $('#topnav').is(':visible') ) hideSomething( '#topnav' );
	if( $('#regionnav').is(':visible') ) hideSomething( '#regionnav' );
	if( $('#categorynav').is(':visible') ) hideSomething( '#categorynav' );
}
function redraw( ){
	redrawFooter( );
	redrawHeader( );
}
function redrawHeader( ){
	html='<div id="header-icons">';
	var current_region_name = localStorage.getItem('region_name');
	html=html+'<a class="navlink" onClick="return changeScreen(\'mapme\')"><i class="fa fa-map-marker"></i></a>';
	if( logged_in ){
		if( show_qr_code ){
			html=html+'<a class="navlink" onClick="return changeScreen(\'scan\')"><i class="fa fa-qrcode"></i></a>';
		}
		html=html+'<a class="navlink" onClick="return changeScreen(\'profile\')"><i class="fa fa-user"></i></a>';
	}
	html=html+'<a class="navlink" id="topnav_link" onClick="return internalToggleNav( \'topnav\' )"><i class="fa fa-bars"></i></a>';
	html=html+'</div>';
	html=html+'<ul id="topnav" class="nav">';
	menu_items=new Array();
	j=0;
	menu_items[j++]=[ 'Map', 'mapme' ];
	if( current_region_name != null ) menu_items[j++]=[ 'About '+current_region_name, 'region' ];
	if( promotion_slides.length > 0 )	menu_items[j++]=[ 'Promotions', 'promotions' ];
	if( logged_in ){
		if( show_qr_code ) {
			menu_items[j++]=[ 'Scan QR code', 'scan' ];
		}
		menu_items[j++]=[ 'Your profile', 'profile' ];
		menu_items[j++]=[ 'Logout', 'logout' ];
	} else {
		menu_items[j++]=[ 'Login / Register', 'login' ];
	}
	menu_items[j++]=[ 'Terms and conditions', 'tandc' ];
	menu_items[j++]=[ 'About', 'about' ];
	arrayLength = menu_items.length;
	for (var i = 0; i < arrayLength; i++) {
		if( menu_items[i][1].substring(0,4) == 'http' ){
			html=html+'<li><a onClick="return openExternalLink(\''+menu_items[i][1]+'\')">'+menu_items[i][0]+'</a></li>';
		} else {
			html=html+'<li><a onClick="return changeScreen(\''+menu_items[i][1]+'\')">'+menu_items[i][0]+'</a></li>';
		}
	}
	html=html+'</ul>';
	$('#header-nav').html(html);
}
/* -------------------- footer ---------------------- */
function actionFooterRegion( i ){
	internalCloseAllNav();
	localStorage.setItem( 'region', regions[i].guid );
	localStorage.setItem( 'region_name', regions[i].name );
	redraw();
	if( lastscreen_div == 'region' ){
		actionRegion();
	} else {
		actionMap();
	}
}
function actionFooterCategory( i ){
	internalCloseAllNav();
	localStorage.setItem( 'category', categories[i].guid );
	localStorage.setItem( 'category_name', categories[i].name );
	redraw();
	actionMap();
}
function redrawFooter( ){
	var current_region = localStorage.getItem('region');
	var current_region_name = localStorage.getItem('region_name');
	if( current_region == null ) current_region_name="All";
	html='<div id="footer-menuleft">';
	html=html+'<a class="navlink" id="topnav_link" onClick="return internalToggleNav( \'regionnav\' )"><span>'+current_region_name+'</span><i class="fa fa-angle-up"></i></a>';
	html=html+'<ul id="regionnav" class="nav">';
	for(i=0;i<regions.length;i++){
		icon='fa-circle-o';
		if( current_region == regions[i].guid ) icon='fa-check-circle-o';
		html=html+'<li><a onClick="return actionFooterRegion('+i+')"><i class="fa '+icon+'"></I> '+regions[i].name+'</a></li>';
	}
	html=html+'</ul></div>';

	var current_category = localStorage.getItem('category');
	var current_category_name = localStorage.getItem('category_name');
	html=html+'<div id="footer-menuright">';
	html=html+'<a class="navlink" id="topnav_link" onClick="return internalToggleNav( \'categorynav\' )"><span>'+current_category_name+'</span><i class="fa fa-angle-up"></i></a>';
	html=html+'<ul id="categorynav" class="nav">';
	for(i=0;i<categories.length;i++){
		icon='fa-circle-o';
		if( current_category == categories[i].guid ) icon='fa-check-circle-o';
		html=html+'<li><a onClick="return actionFooterCategory('+i+')"><i class="fa '+icon+'"></I> '+categories[i].name+'</a></li>';
	}
	html=html+'</ul></div>';
	$('#footer-nav').html(html);
}

/* ------------- about --------------- */
function actionAbout( ){
	showScreen( 'about' );
}
/* ------------- terms --------------- */
function actionTandc( ){
	showScreen( 'tandc' );
	scrollContentToTop( 'tandc' );
}
/* ------------- map --------------- */
function actionMapSuccess(position) {
	var longlat = new google.maps.LatLng(position.coords.latitude, position.coords.longitude);
	if( map_current_position == null ){
		map_current_position = new google.maps.Marker({
			position: longlat,
			map: map,
			icon: 'img/mapposition.png'
		});
	} else {
		map_current_position.setPosition( longlat );
	}
	if( on_geolocation_centertome == true ){
		on_geolocation_centertome=false;
		map.panTo(longlat);
	}
}
function actionMapError(error) {
	appLog( 'actionMapError '+error.message );
}
function actionMapMarkers( ){
	appLog( 'actionMapMarkers' );
	var current_region = localStorage.getItem('region');
	var current_category = localStorage.getItem('category');
	if( current_category == 'all' ){
		if( current_region == '' ){
			where='region_guid <> ?';
			bind=[''];
		} else {
			where='region_guid=?';
			bind=[current_region];
		}
	} else {
		if( current_region == '' ){
			where='category_guid=?';
			bind=[current_category];
		} else {
			where='region_guid=? and category_guid=?';
			bind=[current_region,current_category];
		}
	}
	for(i=0;i<map_markers.length;i++){
		map_markers[i].setMap(null);
	}
	map_markers=[];
	k=0;
	appLog( 'Finding where '+where );
	db_select( 'SELECT * FROM business WHERE '+where, bind, function(rs){
		appLog( 'Plotting '+rs.length+' businesses' );
		for(i=0;i<rs.length;i++){
			longlat_str=rs[i].longlat.split( ',' );
			longlat = {lat: parseFloat(longlat_str[1]), lng: parseFloat(longlat_str[0])};
			icon='';
			for(j=0;j<categories.length;j++){
				if( rs[i].category_guid == categories[j].guid ) icon=categories[j].icon;
			}
			// appLog( 'bus='+rs[i].name+' icon='+icon+' pos='+rs[i].longlat );
			if( icon != '' ){
				map_markers[k] = new google.maps.Marker({
					position: longlat,
					map: map,
					icon: 'img/icon/'+icon,
					url: rs[i].guid
				});
				google.maps.event.addListener(map_markers[k], 'click', function(){
					actionMapMarkersInfoOpen( this.url );
                });
				k=k+1;
			}
		}
	});
}
function actionMapMarkersInfoOpen( listing_guid ){
	bind=[listing_guid];
	db_select( 'SELECT * FROM business WHERE guid=?', bind, function(rs){
		html='<a href="#" onClick="return actionMapMarkersInfoClose()" style="float: right"><i class="fa fa-times-circle-o fa-2x"></i></a>';
		html=html+'<p><strong>'+rs[0].name+'</strong></P>';
		if( rs[0].hours != '' )	html=html+'<P>'+rs[0].hours+'</a></p>';
		if( rs[0].phone != '' )	html=html+'<p><i class="fa fa-phone"></i> '+rs[0].phone+'</p>';
		if( rs[0].web_url != '' ) html=html+'<p><i class="fa fa-link"></i> '+rs[0].web_url+'</p>';
		if( rs[0].address != '' ){
			html=html+'<p><i class="fa fa-map-marker"></i> '+rs[0].address+'</p>';
		}
		if( rs[0].phone != '' )	html=html+'<P><button class="btn btn-main" onClick="openExternalLink( \'tel:'+makePhoneText( rs[0].phone )+'\')">Phone them</button></p>';
		if( rs[0].web_url != '' ) html=html+'<P><button class="btn btn-main" onClick="openExternalLink( \''+rs[0].web_url+'\')">Visit website</button></p>';
		if( rs[0].phone != '' )	{
			mapsurl='https://maps.google.com?saddr=Current+Location&daddr='+( encodeURIComponent( rs[0].address ).replace(/%20/g, '+') );
			html=html+'<P><button class="btn btn-main" onClick="openExternalLink( \''+mapsurl+'\')">Get Directions</button></p>';
		}
		$('#map_overlay').html(html);
		$('#map_overlay').show();
	});
}

function actionMapMarkersInfoClose( ){
	$('#map_overlay').hide();
	return false;
}
function actionMap( ){
	if( maps_loaded == true ){
		on_geolocation_centertome=false;
		actionMapDraw( );
	}
}
function actionMapMe( ){
	on_geolocation_centertome=true;
	actionMapDraw( );
}
function actionMapDraw(  ){
	appLog( 'actionMapDraw' );
	actionMapMarkersInfoClose( );
	showScreen( 'map' );
	var center = app_map_center;
	var zoom = 10;
	var current_region = localStorage.getItem('region');
	if( current_region != '' ){
		zoom = 12;
		for(i=0;i<regions.length;i++){
			if( current_region == regions[i].guid ){
				longlat=regions[i].longlat.split( ',' );
				center = {lat: parseFloat(longlat[0]), lng: parseFloat(longlat[1])};
				break;
			}
		}
	}
	if( map == null ){
		map = new google.maps.Map(document.getElementById('map_canvas'), {
			zoom: zoom,
			center: center,
			disableDefaultUI: true
		});
	}
	
	if( window.cordova ){
		actionMapDeinit();
		appLog( 'actionMap watchPosition' );
		map_watchid = navigator.geolocation.watchPosition(actionMapSuccess, actionMapError, {
			maximumAge: 0,
			timeout: 20000,
			enableHighAccuracy: false
		});
	}

	actionMapMarkers();
	if( on_geolocation_centertome == false ){
		map.panTo(center);
		map.setZoom( zoom );
	}
}

function actionMapDeinit(){
	if( map_watchid != null ){
		appLog( 'actionMapDeinit' );
		navigator.geolocation.clearWatch(map_watchid);
		map_watchid = null;
	}
}
function actionMapInit() {
	appLog( 'actionMapInit' );
	maps_loaded=true;
	if( lastscreen_div == 'loading' && starting_up == false ){
		on_geolocation_centertome=false;
		actionMap( );
	}
}

/* ------------- region --------------- */
function actionRegion( ){
	var current_region = localStorage.getItem('region');
	html='';
	for(i=0;i<regions.length;i++){
		if( current_region == regions[i].guid ){
			html='<h2>'+regions[i].name+'</h2><img src="'+regions[i].image_url+'"><br><p>'+regions[i].description+'</P><button class="btn btn-main" onClick="return changeScreen( \'map\' )">View Map</button><BR> <BR> <BR> <BR> <BR> <BR>';
		}
	}
	$('#region .inner').html(html);
	showScreen( 'region' );
	scrollContentToTop( 'region' );
}

/* ------------- login  --------------- */
function actionLogoutNow( during_startup ){
	appLog( 'actionLogoutNow' );
	localStorage.setItem( 'u', '' );
	localStorage.setItem( 'p', '' );
	logged_in=false;
	if( during_startup == false ){
		redrawHeader( );
		changeScreen( 'map' );
	}
}
function actionLoginNow( u, p, points, show_next ){
	appLog( 'actionLoginNow '+u );
	localStorage.setItem( 'u', u );
	localStorage.setItem( 'p', p );
	if( points != '' ) localStorage.setItem( 'points', points );
	logged_in=true;
	if( show_next != '' ){
		redrawHeader( );
		changeScreen( show_next );
	}
}
function actionLogin( ){
	document.forms['form-login'].elements['u'].value='';
	document.forms['form-login'].elements['p'].value='';
	showScreen( 'login' );
}
function actionLoginDo( ){
	appLog( 'actionLoginDo' );
	showWait( );
	var u=document.forms['form-login'].elements['u'].value;
	var p=$.md5(document.forms['form-login'].elements['p'].value);
	$.post( api_base_url, {
		a: 'login', ds: session, mg: management_guid,
		u: u,
		p: p
	},
	function( data, status ){
		register=data.split( ajax_split_row );
		var row=register[1].split( ajax_split_col );
		if( row[0] != '' ){
			simpleAlert( 'Whoops', row[0] );
		} else {
			actionLoginNow( u,p,row[1],'profile' );
		}
	});
	return false;
}
function actionLoginFacebookSuccess( userdata ){
alert( 'actionLoginFacebookSuccess');
	appLog( 'actionLoginFacebookSuccess' );
}
function actionLoginFacebookFailure( error ){
alert( 'actionLoginFacebookFailure '+error);
	appLog( 'actionLoginFacebookFailure '+error);
}
function actionLoginFacebook( ){
	appLog( 'actionLoginFacebook' );
	alert( 'facebook go' );
	facebookConnectPlugin.login( ['email'], actionLoginFacebookSuccess, actionLoginFacebookFailure );
	alert( 'facebook end' );
}

/* ------------- register  --------------- */
function actionRegister( ){
	document.forms['form-register'].elements['u'].value='';
	document.forms['form-register'].elements['p'].value='';
	showScreen( 'register' );
}
function actionRegisterDo( ){
	appLog( 'actionRegisterDo' );
	var u=document.forms['form-register'].elements['u'].value.toLowerCase();
	var p=$.md5(document.forms['form-register'].elements['p'].value);
	$.post( api_base_url, {
		a: 'register', ds: session, mg: management_guid,
		u: u,
		p: p
	},
	function( data, status ){
		register=data.split( ajax_split_row );
		var row=register[1].split( ajax_split_col );
		if( row[0] != '' ){
			simpleAlert( 'Whoops', row[0] );
		} else {
			actionLoginNow( u,p,row[1],'welcomenewuser' );
		}
	});
	return false;
}

/* ------------- change password --------------- */
function actionChangePassword1( ){
	document.forms['form-reset1'].elements['u'].value='';
	showScreen( 'changepassword1' );
}
function actionChangePassword1Do( ){
	appLog( 'actionChangePassword1Do' );
	var u=document.forms['form-reset1'].elements['u'].value.toLowerCase();
	$.post( api_base_url, {
		a: 'reset1', ds: session, mg: management_guid,
		u: u
	},
	function( data, status ){
		register=data.split( ajax_split_row );
		var row=register[1].split( ajax_split_col );
		if( row[0] != '' ){
			simpleAlert( 'Whoops', row[0] );
		} else {
			actionChangePassword2( );
		}
	});
	return false;
}
function actionChangePassword2( ){
	document.forms['form-reset2'].elements['u'].value=document.forms['form-reset1'].elements['u'].value;
	document.forms['form-reset2'].elements['c'].value='';
	document.forms['form-reset2'].elements['p'].value='';
	showScreen( 'changepassword2' );
}
function actionChangePassword2Do( ){
	appLog( 'actionChangePassword2Do' );
	var u=document.forms['form-reset1'].elements['u'].value.toLowerCase();
	var c=document.forms['form-reset2'].elements['c'].value;
	var p=$.md5(document.forms['form-reset2'].elements['p'].value);
	$.post( api_base_url, {
		a: 'reset2', ds: session, mg: management_guid,
		u: u,
		c: c,
		p: p
	},
	function( data, status ){
		register=data.split( ajax_split_row );
		var row=register[1].split( ajax_split_col );
		if( row[0] != '' ){
			simpleAlert( 'Whoops', row[0] );
		} else {
			actionLoginNow( u,p,'','welcomenewuser' );
		}
	});
	return false;
}

function actionProfile( ){
	html='<h2>Your profile</h2><P>The currently logged in user is '+localStorage.getItem( 'u' )+'. If you are a winner for any prizes you will be notified on this email address.</P>';
	html=html+'<h2>Your points</h2><h3>'+localStorage.getItem( 'points' )+'</h3><p>These points will give you entry into our prize draws. They will be reset to zero after each draw.</p>';
	$('#profile .inner').html(html);
	showScreen( 'profile' );
}
function actionWelcomeNewUser( ){
	html='<h1>Welcome</h1><P>Thank you for signing up to Buy Local. </P>';
	html=html+'<h2>Your starting points</h2><h3>'+localStorage.getItem( 'points' )+'</h3><p>These points will give you entry into our prize draws. They will be reset to zero after each draw.</p>';
	$('#welcomenewuser .inner').html(html);
	showScreen( 'welcomenewuser' );
}

/* ------------- scanning --------------- */
function actionScanFailed( error ){
	appLog( 'actionScanFailed' );
	html='<h2>Whoops</h2><P>Sorry but the scan of the QR code has not worked.</P><P>'+error+'</P>';
	html=html+'<button class="btn btn-main" onClick="return actionScan( )">Try again</button>';
	html=html+'<button class="btn btn-main" onClick="return actionMap( )">Back to map</button>';
	$('#scanfailed .inner').html(html);
	showScreen( 'scanfailed' );
}
function actionScanSuccess( data ){
	appLog( 'actionScanSuccess' );
	showWait( );
	var u=localStorage.getItem( 'u' );
	var p=localStorage.getItem( 'p' );
	$.post( api_base_url, {
		a: 'scan', ds: session, mg: management_guid,
		u: u,
		p: p,
		s: data
	},
	function( data, status ){
		register=data.split( ajax_split_row );
		var row=register[1].split( ajax_split_col );
		if( row[0] != '' ){
			actionScanFailed( row[0] );
		} else {
			localStorage.setItem( 'points', row[1] );
			html='<h2>Congratulations</h2><P>Your scan of the code was successful and you have earned <B>'+row[2]+' points</b> from visiting <B>'+row[3]+'</b> today.';
			html=html+'<h2>Your points</h2><h3>'+localStorage.getItem( 'points' )+'</h3><p>These points will give you entry into our prize draws. They will be reset to zero after each draw.</p>';
			$('#scansuccess .inner').html(html);
			showScreen( 'scansuccess' );
		}
	});
}
function actionScan( ){
	cordova.plugins.barcodeScanner.scan(
		function (result) {
			if(!result.cancelled){
				actionScanSuccess( result.text );
			} else {
				actionScanFailed( '' );
			}
		},
		function (error) {
			actionScanFailed( error );
		},
		{
			preferFrontCamera : false, // iOS and Android
			showFlipCameraButton : false, // iOS and Android
			showTorchButton : true, // iOS and Android
			torchOn: false, // Android, launch with the torch switched on (if available)
			prompt : "Line up the code or press the back button to cancel", // Android
			resultDisplayDuration: 0, // Android, display scanned text for X ms. 0 suppresses it entirely, default 1500
			formats : "QR_CODE", // default: all but PDF_417 and RSS_EXPANDED
			orientation : "portrait", // Android only (portrait|landscape), default unset so it rotates with the device
			disableAnimations : true, // iOS
			disableSuccessBeep: false // iOS
		}
   );
}

/* ------------- about --------------- */
function actionAbout( ){
	showScreen( 'about' );
	if( about_carousel == null ){
		html='<ul>';
		for(i=0;i<about_slides.length;i++){
			html=html+'<li';
			if( i == 0 ) html=html+' class="active"';
			html=html+' onclick="about_carousel.goToPage('+i+')"></li>';
		}
		html=html+'</ul>';
		$('#about-slidecontrols').html(html);
		document.addEventListener('touchmove', function (e) { e.preventDefault(); }, false);	
		about_carousel = new SwipeView('#about-slider', {
			numberOfPages: about_slides.length,
			hastyPageFlip: true
		});
		for (i=0; i<3; i++) {
			page = i==0 ? about_slides.length-1 : i-1;
			el = document.createElement('span');
			el.innerHTML = about_slides[page];
			about_carousel.masterPages[i].appendChild(el)
		}	
		about_carousel.onFlip(function () {
			var el,
				upcoming,
				i;
			for (i=0; i<3; i++) {
				upcoming = about_carousel.masterPages[i].dataset.upcomingPageIndex;
				if (upcoming != about_carousel.masterPages[i].dataset.pageIndex) {
					el = about_carousel.masterPages[i].querySelector('span');
					el.innerHTML = about_slides[upcoming];
				}
			}
			$( '#about-slidecontrols ul li' ).removeClass('active');
			$( '#about-slidecontrols ul li:nth-child('+(about_carousel.pageIndex+1)+')' ).addClass('active');
		});
	} else {
		about_carousel.goToPage(0);
	}
}

/* ------------- promotions --------------- */
function makePromotion( promotion ){
	var html='<div class="promoclose" onClick="actionMap()"></div>';
	if( promotion.url == none ){
		html=html+'<img src="'+promotion.image+'">';
	} else {
		html=html+'<a href="'+promotion.url+'"><img src="'+promotion.image+'"></a>';
	}
	return html;
}
function actionPromotions( ){
	showScreen( 'promotions' );
	if( promotions_carousel == null ){
		html=''
		if( promotion_slides.length > 1 ){
			html='<ul>';
			for(i=0;i<promotion_slides.length;i++){
				html=html+'<li';
				if( i == 0 ) html=html+' class="active"';
				html=html+' onclick="promotions_carousel.goToPage('+i+')"></li>';
			}
			html=html+'</ul>';
		}
		$('#promotions-slidecontrols').html(html);
		if( promotion_slides.length > 1 ){
			document.addEventListener('touchmove', function (e) { e.preventDefault(); }, false);
		}
		promotions_carousel = new SwipeView('#promotions-slider', {
			numberOfPages: promotion_slides.length,
			hastyPageFlip: true
		});
		for (i=0; i<3; i++) {
			page = i==0 ? promotion_slides.length-1 : i-1;
			el = document.createElement('span');
			if( promotion_slides[page] ){
				el.innerHTML = makePromotion( promotion_slides[page] );
			}
			promotions_carousel.masterPages[i].appendChild(el)
		}	
		if( promotion_slides.length > 1 ){
			promotions_carousel.onFlip(function () {
				var el,
					upcoming,
					i;
				for (i=0; i<3; i++) {
					upcoming = promotions_carousel.masterPages[i].dataset.upcomingPageIndex;
					if (upcoming != promotions_carousel.masterPages[i].dataset.pageIndex) {
						el = promotions_carousel.masterPages[i].querySelector('span');
						el.innerHTML = makePromotion( promotion_slides[upcoming] );
					}
				}
				$( '#promotions-slidecontrols ul li' ).removeClass('active');
				$( '#promotions-slidecontrols ul li:nth-child('+(promotions_carousel.pageIndex+1)+')' ).addClass('active');
			});
		}
	} else {
		promotions_carousel.goToPage(0);
	}
	if( header_visible == false ){
		header_visible=true;
		$('header').show();
		$('footer').show();
	}
}


