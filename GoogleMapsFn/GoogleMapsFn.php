<?php
/**
 * GoogleMapsFn MediaWiki extension
 * Defines parser function used to control Google maps v3
 *
 * @file
 * @ingroup Extensions
 * @version 0.1.1
 * @author Dmitriy Sintsov <questpc@rambler.ru>
 * @link https://www.mediawiki.org/wiki/Extension:GoogleMapsFn
 * @license http://www.gnu.org/copyleft/gpl.html GNU General Public License 2.0 or later
 */

if ( !defined( 'MEDIAWIKI' ) ) {
	die( "This is a MediaWiki extension, not a valid entry point.\n" );
}

// Extension credits that will show up on Special:Version
$wgExtensionCredits['parserhook'][] = array( 
	'path' => __FILE__,
	'name' => 'GoogleMapsFn',
	'version' => '0.1.1',
	'author' => 'Dmitriy Sintsov',
	'descriptionmsg' => 'gmfn-desc',
	'url' => 'https://www.mediawiki.org/wiki/Extension:GoogleMapsFn'
);

GMFn::init();

/**
 * Extension main class: initialization, common methods (used across the classes),
 * hooks and parser function.
 */
class GMFn {

	const MAP_TAG = '<div class="gmfn_canvas"';
	const EDIT_ATTR = 'data-gmfn-edit=""';

	static $extDir; // filesys path with windows path fix
	static $scriptPath; // web server path to extension resources

	// instances of Parser and Title used to selectively parse input text
	static $parser;
	static $title;
	// current instance of OutputPage
	static $out;

	// whether the text of page was already checked for presence of GMFn data
	static $textChecked = false;

	// list of extension's ResourceLoader modules in "compact" format
	static private $mapModules = array(
		'jquery.ui.prettybuttons' => array(
			'scripts' => 'jquery.ui.prettybuttons.js',
			'path' => '#'
		),
		'jquery.fieldselection' => array(
			'scripts' => 'jquery-fieldselection.js',
			'path' => '#'
		),
		# 'top' module
		'ext.gmfn.startup' => array(
			'scripts' => 'startup.js',
		),
		'ext.gmfn.view.marker' => array(
			'scripts' => 'marker.js',
			'path' => 'view',
			'dependencies' => 'ext.gmfn.startup'
		),
		'ext.gmfn.view.searchbox' => array(
			'scripts' => 'searchbox.js',
			'path' => 'view',
			'messages' => array(
				'gmfn-searchbox-placeholder',
			),
			'dependencies' => 'ext.gmfn.startup'
		),
		'ext.gmfn.view.map' => array(
			'scripts' => 'map.js',
			'dependencies' => array(
				'ext.gmfn.view.marker',
				'ext.gmfn.view.searchbox',
			),
			'path' => 'view'
		),
		'ext.gmfn.parameter.sanitizer' => array(
			'scripts' => 'parameter.sanitizer.js',
			'dependencies' => 'mediawiki.jqueryMsg',
			'path' => 'edit'
		),
		'ext.gmfn.toolbar' => array(
			'scripts' => 'toolbar.js',
			'dependencies' => array(
				'jquery.json',
				'ext.gmfn.startup'
			),
			'path' => 'edit'
		),
		'ext.gmfn.tagheader' => array(
			'scripts' => 'tagheader.js',
			'dependencies' => 'ext.gmfn.startup',
			'path' => 'edit'
		),
		'ext.gmfn.dimension' => array(
			'scripts' => 'dimension.js',
			'dependencies' => 'ext.gmfn.startup',
			'path' => 'edit'
		),
		'ext.gmfn.edit.marker' => array(
			'scripts' => 'marker.js',
			// warning: when the module is loaded at clientside, messages are not loaded
			'messages' => array(
				'gmfn-edit-marker',
				'gmfn-view-marker',
				'gmfn-remove-marker'
			),
			'dependencies' => array(
				'ext.gmfn.parameter.sanitizer',
				'jquery.fieldselection',
				'jquery.tipsy'
			),
			'path' => 'edit'
		),
		'ext.gmfn.edit.map' => array(
			'styles' => 'common.css',
			'scripts' => array(
				'map.js',
				'map.events.js',
				'map.markers.js',
				'map.properties.js'
			),
			// warning: when the module was loaded at clientside, messages were not loaded
			'messages' => array(
				'gmfn-show-code',
				'gmfn-change-center',
				'gmfn-resize-map',
				'gmfn-edit-lat',
				'gmfn-edit-lng',
				'gmfn-edit-zoom',
				'gmfn-edit-width',
				'gmfn-edit-height',
				'gmfn-edit-align',
				'gmfn-edit-caption',
				'gmfn-edit-searchbox',
				'gmfn-switch-searchbox',
				'gmfn-align-default',
				'gmfn-align-left',
				'gmfn-align-right',
				'gmfn-error-lat',
				'gmfn-error-lng',
				'gmfn-error-width',
				'gmfn-error-height'
			),
			'dependencies' => array(
				'ext.gmfn.view.map',
				'jquery.ui.button',
				'jquery.ui.slider',
				'jquery.ui.dialog',
				'ext.gmfn.tagheader',
				'ext.gmfn.toolbar',
				'ext.gmfn.dimension',
				'ext.gmfn.edit.marker'
			),
			'path' => 'edit'
		),
		'ext.gmfn.view' => array(
			'scripts' => 'populate.js',
			'dependencies' => array(
				'jquery.ui.prettybuttons',
				'ext.gmfn.view.map'
			)
		),
		'ext.gmfn.edit' => array(
			'scripts' => 'populate.js',
			'dependencies' => array(
				'jquery.ui.prettybuttons',
				'ext.gmfn.edit.map'
			)
		),
	);

	# {{#googlemap}} parser function hook counter
	static $fnCount = 0;

	/**
	 * Populates 'localBasePath' / 'remoteExtPath' keys of self::$mapModules
	 */
	static function preprocessModules() {
		foreach ( self::$mapModules as $moduleName => &$module ) {
			if ( array_key_exists( 'path', $module ) ) {
				// hash is a special path that indicates that
				// path matches module name
				$path = '/' . ( ($module['path'] === '#') ?
					$moduleName : $module['path'] );
				unset( $module['path'] );
			} else {
				$path = '';
			}
			$module['localBasePath'] = self::$extDir . $path;
			$module['remoteExtPath'] = "GoogleMapsFn{$path}";
		}
	}

	static function init() {
		global $wgScriptPath, $wgResourceModules, $wgExtensionMessagesFiles;
		global $wgHooks, $wgAutoloadClasses;
		# prerequisites
		if ( !class_exists( 'RequestContext' ) ) {
			die( "This extension uses RequestContext class which is available since MediaWiki 1.18\n" );
		}
		if ( !isset( $wgResourceModules ) ) {
			die( "This extension requires ResourceLoader which is available since MediaWiki 1.17\n" );
		}

		# local path
		self::$extDir = str_replace( "\\", "/", dirname( __FILE__ ) );
		# remote path
		$dirs = explode( '/', self::$extDir );
		$topDir = array_pop( $dirs );
		self::$scriptPath = $wgScriptPath . '/extensions' . ( ( $topDir == 'extensions' ) ? '' : '/' . $topDir );

		$wgAutoloadClasses['GMFnException'] = self::$extDir . '/GMFnException.php';
		$wgAutoloadClasses['GMFnMap'] = self::$extDir . '/GMFnMap.php';
		$wgAutoloadClasses['GMFnMarkers'] = self::$extDir . '/GMFnMarkers.php';

		self::preprocessModules();
		$wgResourceModules += self::$mapModules;

		$wgExtensionMessagesFiles['GMFn'] = self::$extDir . '/i18n/GMFn.i18n.php';
		$wgExtensionMessagesFiles['GMFnMagic'] = self::$extDir . '/i18n/GMFn.magic.php';

		$wgHooks['ParserFirstCallInit'][] =
		// non-client cached view
		$wgHooks['BeforePageDisplay'][] =
		// client cached view
		$wgHooks['OutputPageCheckLastModified'][] = new self;
	}

	/**
	 * Matches floats but does not allow hexadecimal numbers
	 */
	static function isFloat( $val ) {
		return is_numeric( $val ) && !preg_match( '/[^\d.+\-e]/', $val );
	}

	static function isValidLatitude( $lat ) {
		return self::isFloat( $lat ) && $lat >= -90 && $lat <= 90;
	}

	static function isValidLongitude( $lng ) {
		return self::isFloat( $lng ) && $lng >= -180 && $lng <= 180;
	}

	static protected function getOutput() {
		if ( !is_object( self::$out ) ) {
			# last resort
			self::$out = RequestContext::getMain()->getOutput();
		}
	}

	static protected function getTitle() {
		if ( !is_object( self::$title ) ) {
			self::$title = self::$out->getContext()->getTitle();
		}
	}

	/**
	 * Register the extension with the WikiText parser.
	 * @param  $parser Parser
	 */
	static function onParserFirstCallInit( $parser ) {
		self::$parser = clone $parser;
		self::getOutput();
		self::getTitle();
		# setup parser function hook
		$parser->setFunctionHook( 'googlemap', array( __CLASS__, 'renderMap' ), SFH_OBJECT_ARGS );
		return true;
	}

	/**
	 * Determines, whether all of the requested 'dependencies' modules
	 * are registered by ResourceLoader.
	 * Currently this is used to detect MW 1.18.2, which does not have
	 * 'mediawiki.jqueryMsg' module.
	 */
	static protected function checkAllModulesExists() {
		$allModules = array_keys( self::$mapModules );
		foreach ( self::$mapModules as $moduleName => $moduleDefinition ) {
			if ( !array_key_exists( 'dependencies', $moduleDefinition ) ) {
				continue;
			}
			if ( is_array( $moduleDefinition['dependencies'] ) ) {
				$allModules += $moduleDefinition['dependencies'];
			} else {
				# We do not check for multiple matches in values:
				# it would only decrease performance in this case.
				$allModules[] = $moduleDefinition['dependencies'];
			}
		}
		$nonExistantModules = array_diff(
			$allModules,
			self::$out->getResourceLoader()->getModuleNames()
		);
		if ( count( $nonExistantModules ) > 0 ) {
			throw new MWException( 'Cannot find requested module(s): ' .
				implode( ',', $nonExistantModules ) .
				' in ' . __METHOD__
			);
		}
	}

	/**
	 * Conditionally loads 'ext.gmfn.edit' or 'ext.gmfn.view' module only for
	 * required pages, by checking page's ParserOutput (both in non-cached and
	 * cached page loads).
	 */
	static protected function checkModule() {
		self::getTitle();
		# MessageBlobStore::clear();
		# do not check the text twice;
		# also simple sanity check for CLI calls and special pages (if any)
		if ( self::$textChecked ||
				!is_object( self::$title ) ||
				self::$title->getNamespace() === NS_SPECIAL ) {
			return true;
		}
		$article = new Article( self::$title, 0 );
		# whether the parser output is available
		if ( !($article instanceof Article) ||
				( $parserOutput = $article->getParserOutput() ) === false ) {
			return true;
		}
		self::$textChecked = true;
		# Check, whether current output has embedded {{#googlemap}} data.
		# It is not bullet-proof but should be enough for the most of cases.
		# sdv_dbg('parserOutput',$parserOutput);
		if ( ($pos = strpos( $text = $parserOutput->getText(), self::MAP_TAG )) !== false ) {
			# There used to be server-side load of very small module, which then checked
			# generated DOM and then loaded either view or edit module via mw.loader.using().
			#
			# However, mw.loader.using() and mw.loader.load() did not work in conjunction with
			# google.maps loader callback; stopping executing JS code with no errors in
			# Chrome console. It worked reliably only in IE9, which is strange.
			$module = ( strpos( $text, self::EDIT_ATTR, $pos ) !== false ) ?
				'ext.gmfn.edit' : 'ext.gmfn.view';
			# There are references on the page, load the extension's startup module.
			unset( $text );
			# make sure all of dependant modules are actually available
			self::checkAllModulesExists();
			# load view or edit module
			self::$out->addModules( $module );
		}
		return true;
	}

	/**
	 * Non-cached page load.
	 */
	static function onBeforePageDisplay( OutputPage &$out, Skin &$skin ) {
		self::$out = $out;
		return self::checkModule();
	}

	/**
	 * Cached page load. If there is a better hook - let me know.
	 */
	static function onOutputPageCheckLastModified( &$modifiedTimes ) {
		self::getOutput();
		return self::checkModule();
	}

	/**
	 * Parses provided wiki text in context of current title (page).
	 * Used to process map markers wikitext.
	 */
	static function parseWikiText( $text ) {
		return self::$parser->parse( $text, self::$title, new ParserOptions() )->getText();
	}

	/**
	 * #googlemapfn parser function hook.
	 *
	 * @param  &$parser Parser
	 *   The wikitext parser.
	 * @param  &$frame PPFrame
	 *   Current parser frame (used to expand template arguments).
	 * @param  $args array
	 *   parameters of parser function
	 * @return map html 
	 */
	static function renderMap( Parser &$parser, PPFrame $frame, array $args ) {
		$attrs = array();
		$rawMarkers = array();
		foreach ( $args as $arg ) {
			if ( !is_string( $arg ) ) {
				$arg = trim( $frame->expand( $arg ) );
			}
			preg_match( '/^([a-z.]+)\s*=\s*(.*)$/si', $arg, $match );
			if ( count( $match ) < 3 ) {
				$rawMarkers[] = $arg;
			} else {
				$attrs[$match[1]] = $match[2];
			}
		}
		# sdv_dbg('attrs',$attrs);
		# sdv_dbg('rawMarkers',$rawMarkers);
		return strval( new GMFnMap( $rawMarkers, $attrs, self::$fnCount++ ) );
	}

} /* end of GMFn class */
