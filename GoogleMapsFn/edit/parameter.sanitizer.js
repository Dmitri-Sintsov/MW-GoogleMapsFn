/**
 * GoogleMapsFn MediaWiki extension
 * Defines parser function used to control Google maps v3
 *
 * @file
 * @ingroup Extensions
 * @version 0.2.0
 * @author Dmitriy Sintsov <questpc@rambler.ru>
 * @link https://www.mediawiki.org/wiki/Extension:GoogleMapsFn
 * @license http://www.gnu.org/copyleft/gpl.html GNU General Public License 2.0 or later
 */

/**
 * Escapes non-lexical pipe characters in wikitext.
 */

( function( $, mw ) {

var parser = new mw.jqueryMsg.parser();
var sanitizer = null;

mw.gmfn.ParameterSanitizer = function( text ) {
	if ( this instanceof arguments.callee ) {
		// instantiation
		return;
	}
	if ( sanitizer === null ) {
		// singleton
		sanitizer = new arguments.callee();
	}
	sanitizer.processText( text );
	return sanitizer;
}

// list of prototypes to extend mw.gmfn.ParameterSanitizer
var _ParameterSanitizer = {};

_ParameterSanitizer.processText = function( text ) {
	this.error = null;
	this.text = '';
	try {
		this.ast = parser.wikiTextToAst( text );
	} catch( e ) {
		this.error = e.toString();
		this.text = this.escapePipes( text );
		return;
	}
	this.getEscapedText();
}

_ParameterSanitizer.escapePipes = function( s ) {
	return s.replace(/\|/g, '&#124;');
}

_ParameterSanitizer.getEscapedText = function() {
	this.text = '';
	this.recursiveEscape( this.ast );
}

_ParameterSanitizer.recursiveEscape = function( ast ) {
	if ( typeof ast === 'string' ) {
		this.text += this.escapePipes( ast );
		return;
	}
	switch( ast[0] ) {
	case 'REPLACE' :
		this.text += '$' + (ast[1] + 1);
		return;
	case 'LINK' :
		this.text += '[';
		this.recursiveEscape( ast[1] );
		this.text += ' ';
		this.recursiveEscape( ast[2] );
		this.text += ']';
		return;
	case 'WLINK':
		this.text += '[[';
		if ( typeof ast[1] === 'string' ) {
			// pipe separator has not to be escaped
			this.text += ast[1];
		} else {
			this.recursiveEscape( ast[1] );
		}
		this.text += ']]';
		return;
	case 'CONCAT':
		for ( var i = 1; i < ast.length; i++ ) {
			this.recursiveEscape( ast[i] );
		}
		return;
	default: // template
		// template name
		this.text += '{{' + ast[0];
		for ( var i = 1; i < ast.length; i++ ) {
			this.text += '|';
			this.recursiveEscape( ast[i] );
		}
		this.text += '}}';
	}
}

$.extend( mw.gmfn.ParameterSanitizer.prototype, _ParameterSanitizer );

} )( jQuery, mediaWiki );
