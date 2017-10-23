
var lastscreen_div='';
var scrolling_divs;
var shutting_down=false;
var device_debug=false;

/* dev stuff */
function appLogDate(){
	var dt = new Date();
	var time = dt.getHours() + ":" + dt.getMinutes() + ":" + dt.getSeconds() + ":"+dt.getMilliseconds();
	return time+' - ';
}
function getTimestamp(){
	return Date.now();
}
function appLog( text ){
	if( window.cordova && device_debug ){
		alert( text );
	} else if( !window.cordova ){
		console.log( appLogDate()+text );
	}
}
function dbLog( text ){
	if( !window.cordova ){
		console.log( appLogDate()+text );
	}
}
/* show screens */
function showScreen( screen_div ){
	if( lastscreen_div != '' ){
		appLog( 'showScreen hide '+lastscreen_div );
		$('#'+lastscreen_div).hide();
	}
	appLog( 'showScreen '+screen_div );
	$('#'+screen_div).show();
	hideWait( );
	lastscreen_div=screen_div;	
}
function showSomething( thing ){
	$(thing).show();
}
function hideSomething( thing ){
	$(thing).hide();
}
function showWait( ){
	showSomething( '#pleasewait' );
}
function hideWait( ){
	hideSomething( '#pleasewait' );
}
/* networking */
function checkOnlineState() {
	onlinemode=false;
	if( window.cordova ){
		if( navigator.connection.type != Connection.NONE ){
			onlinemode=true;
		}
	} else {
		onlinemode=true;
	}
}
/* scrolling */
function scrollContentToTop( id ){
	$('#'+id+' .inner').scrollTop(0);
}
function openExternalLink( url ){
	window.open(url, '_system');
/*
if(device.platform === 'Android') {
        navigator.app.loadUrl(url, {openExternal:true});
    } else {
    }
*/
}
function makePhoneText( text_raw ){
	text_new=text_raw;
	if( text_new.substring(0,1) == '0' ) text_new=text_new.substring(1,100);
	text_new = text_new.replace(/\s+/g, '');
	text="+64"+text_new;
	return text;
}

function simpleAlertDismissed( ){
}
function simpleAlert( heading, text ){
	hideWait( );
	if( window.cordova ){
		navigator.notification.alert( text, simpleAlertDismissed, heading, 'Ok' )
	} else {
		alert( heading+'\n\n'+text );
	}
}
function NoNetwork(){
	shutting_down=true;
	navigator.notification.alert( app_name+' requires an internet connection', exitFromApp, 'No Internet', 'Ok' )
}
function exitFromApp(){
	navigator.app.exitApp();
}

jQuery(document).ready(function () {
	/* external links */

}).on('deviceready', function () {
	appLog( 'Received deviceready' );
	$(document).trigger( 'online' );
/*
if( window.cordova ){
		var networkState = navigator.connection.type;
		if(networkState == Connection.NONE ) NoNetwork( );
	} else {
*/
//	}
}).on('online', function () {
	appLog( 'Received online' );
	if( shutting_down == false ){
		// if( !window.cordova ) $('*').css('border','1px dashed #ff0000');
		// $('*').css('border','1px dashed #ff0000');
		if( navigator.userAgent.match(/(iPhone)|(iPad)/) ){
			$('body').addClass( 'iphone' );
		}
/*
		scrolling_divs = new Array();
		$('.scroller').each(function(){
			id = $(this).attr('id');
			scrolling_divs.push(new iScroll(id, { hScrollbar: false, vScrollbar: true } ) );
		});
*/
		hideWait( );
		changeScreen( '' );
	}
}).on('offline', function () {
	appLog( 'Received offline' );
	NoNetwork( );
});
