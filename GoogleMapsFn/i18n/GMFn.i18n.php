<?php
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
 * Messages list.
 */

$messages = array();

/** English (English)
 * @author QuestPC
 */
$messages['en'] = array(
	'gmfn-desc' => 'Defines parser function used to control Google maps v3',
	'gmfn-edit-marker' => 'Click to edit current marker',
	'gmfn-view-marker' => 'Click to view current marker',
	'gmfn-remove-marker' => 'Click to remove current marker',
	'gmfn-edit-lat' => 'Latitude',
	'gmfn-edit-lng' => 'Longitude',
	'gmfn-edit-zoom' => 'Zoom',
	'gmfn-edit-width' => 'Width',
	'gmfn-edit-height' => 'Height',
	'gmfn-edit-align' => 'Align',
	'gmfn-edit-caption' => 'Caption',
	'gmfn-edit-searchbox' => 'SearchBox',
	'gmfn-switch-searchbox' => 'Use SearchBox',
	'gmfn-searchbox-placeholder' => 'Search locations',
	'gmfn-align-default' => 'Default',
	'gmfn-align-left' => 'Left',
	'gmfn-align-right' => 'Right',
	'gmfn-show-code' => 'Show code',
	'gmfn-change-center' => 'Drag map content to change center',
	'gmfn-resize-map' => 'Drag map borders to resize',
	'gmfn-error-lat' => 'Invalid or omitted value of latitude: $1',
	'gmfn-error-lng' => 'Invalid or omitted value of longitude: $1',
	'gmfn-error-width' => 'Invalid or omitted value of width: $1',
	'gmfn-error-height' => 'Invalid or omitted value of height: $1',
	'gmfn-error-empty-marker-description' => 'Map marker description cannot be empty',
);

/** Русский (Russian)
 * @author QuestPC
 */
$messages['ru'] = array(
	'gmfn-desc' => 'Определяет функцию парсера для управления картами Google v3',
	'gmfn-edit-marker' => 'Нажмите для правки маркера',
	'gmfn-view-marker' => 'Нажмите для просмотра маркера',
	'gmfn-remove-marker' => 'Нажмите для удаления маркера',
	'gmfn-edit-lat' => 'Широта',
	'gmfn-edit-lng' => 'Долгота',
	'gmfn-edit-zoom' => 'Приближение',
	'gmfn-edit-width' => 'Ширина',
	'gmfn-edit-height' => 'Высота',
	'gmfn-edit-align' => 'Выравнивание',
	'gmfn-edit-caption' => 'Описание',
	'gmfn-edit-searchbox' => 'Поле поиска',
	'gmfn-switch-searchbox' => 'Включить поле поиска',
	'gmfn-searchbox-placeholder' => 'Поиск мест',
	'gmfn-align-default' => 'По умолчанию',
	'gmfn-align-left' => 'Влево',
	'gmfn-align-right' => 'Вправо',
	'gmfn-show-code' => 'Показать код',
	'gmfn-change-center' => 'Двигайте карту для изменения центра',
	'gmfn-resize-map' => 'Двигайте границу карты для изменения размера',
	'gmfn-error-lat' => 'Неверное или отсутствующее значение широты: $1',
	'gmfn-error-lng' => 'Неверное или отсутствующее значение долготы: $1',
	'gmfn-error-width' => 'Неверное или отсутствующее значение ширины: $1',
	'gmfn-error-height' => 'Неверное или отсутствующее значение высоты: $1',
	'gmfn-error-empty-marker-description' => 'Описание маркера не может быть пустым',
);
