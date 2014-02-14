/**
 * Copyright 2011-2014 Manish Shanker
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * @author Manish Shanker
 */

(function ($) {
    "use strict";

    var filtersContainer = {};

    $.mettleDataGrid = $.extend(true, $.mettleDataGrid, {
        plugin: {
            filters: function ($mettleDataGrid, options) {

                options = $.extend({
                    isGridFilterable: true,
                    filterBy: null,
                    onFilter: $.noop
                }, options);

                var $filters;

                function onFilterChange() {
                    if ($filters) {
                        var filter = [];

                        forEachFilter($filters, function ($filter, type) {
                            var fValue = $.mettleDataGrid.filter[type].getValue($filter);
                            if (fValue) {
                                fValue.id = $.mettleDataGrid.getElementId($filter.attr("id"));
                                fValue.valueType = fValue.valueType || type;
                                filter.push(fValue);
                            }
                        });
                        if (filter && filter.length) {
                            $filters.addClass("filtered");
                        } else {
                            $filters.removeClass("filtered");
                        }
                        $mettleDataGrid.find(".mettleDataGrid-rows")[0].scrollTop = 0;
                        options.onFilter(filter);
                    }
                }

                function getFilters() {
                    return $filters;
                }

                function load() {
                    if (!options.isGridFilterable || !(options.filters && options.filters.length)) {
                        return;
                    }

                    $filters = renderFilters(options);

                    filtersContainer[options.id] = $filters;

                    forEachFilter($filters, function ($filter, type) {
                        $filter.addClass("mettleDataGrid-filter-control");
                        $.mettleDataGrid.filter[type].init($filter, onFilterChange, options.id, $mettleDataGrid);
                    });

                    if (options.filterBy && options.filterBy.length) {
                        $.each(options.filterBy, function (i, filter) {
                            var $filter = $filters.find("#" + options.id + "Filter_" + filter.id);
                            if ($filter.length) {
                                $.mettleDataGrid.filter[getFilterType($filter)].filterBy($filter, filter);
                            }
                        });
                        $filters.addClass("filtered");
                    } else {
                        $filters.removeClass("filtered");
                    }

                    $mettleDataGrid.find(".mettleDataGrid-head").append(getFilters());
                }

                function destroy() {
                    delete filtersContainer[options.id];
                    if ($filters) {
                        forEachFilter($filters, function ($filter, type) {
                            $.mettleDataGrid.filter[type].destroy($filter, $mettleDataGrid);
                        });
                        $filters.empty();
                        $filters = null;
                    }
                    options = null;
                }

                return {
                    load: load,
                    destroy: destroy
                };
            }
        }
    });

    function renderFilters(options) {
        return headingRowElementsRenderer(options.columns, {
            container: "<div class='mettleDataGrid-filter'></div>",
            cell: "<span class='cell {columnId} {cssClass}' id='{id}'>{value}</span>",
            cellContent: function (column) {
                return {
                    value: getFilter(column.filterType, column.filterData, options.id + "Filter_" + column.id),
                    id: options.id + "ColFilter_" + column.id,
                    columnId: column.id,
                    cssClass: ""
                };
            }
        });
    }

    function headingRowElementsRenderer(columns, template) {
        var $row = $(template.container),
            colCount = columns.length;
        $.each(columns, function (i, column) {
            if (column.render !== false) {
                var templateData = template.cellContent(column),
                    $cell;
                templateData.cssClass = templateData.cssClass + (i === colCount - 1 ? " last" : "") + (i === 0 ? " first" : "");
                $cell = $(template.cell.supplant(templateData));
                $cell.css({
                    width: column.width,
                    display: column.isHidden ? "none" : ""
                });
                $row.append($cell);
            }
        });
        return $row;
    }

    function getFilter(filterType, filterData, id) {
        if (filterType === undefined) {
            return "";
        }
        if ($.mettleDataGrid.filter[filterType]) {
            return $.mettleDataGrid.filter[filterType].render(id, filterData).supplant({
                filterIdentifier: filterType + "-filter"
            });
        }
        throw "Unknown filter type defined in column data. [Filter type: " + filterType + ", id: " + id + "]";
    }

    function forEachFilter($filters, callback) {
        if ($.mettleDataGrid.filter) {
            $.each($.mettleDataGrid.filter, function (key) {
                var $f = $filters.find("." + key + "-filter");
                $f.each(function () {
                    callback($(this), key);
                });
            });
        }
    }

    function getFilterType($filter) {
        var type = "";
        $.each($.mettleDataGrid.filter, function (key) {
            if ($filter.hasClass(key + "-filter")) {
                type = key;
                return false;
            }
            return true;
        });
        return type;
    }

}(jQuery));