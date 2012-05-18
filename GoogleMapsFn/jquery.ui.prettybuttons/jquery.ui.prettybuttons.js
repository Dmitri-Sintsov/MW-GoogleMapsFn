(function() {

	var funcs = {

		prettyButtons : function() {
			var $e = (this.jquery) ? this : jQuery(this);
			$e.find('textarea, input:text, input:password, input[type=email]').button();
			return $e;
		}

	};

	jQuery.extend(jQuery.fn, funcs);

})();
