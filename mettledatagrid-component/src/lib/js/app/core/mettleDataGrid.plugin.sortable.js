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

    $.mettleDataGrid = $.extend(true, $.mettleDataGrid, {
        plugin: {
            sortable: function ($mettleDataGrid, options) {

                options = $.extend({
                    isGridSortable: true,
                    sortBy: null,
                    onSort: $.noop
                }, options);

                var SortDirection = {
                    ASC: "asc",
                    DESC: "desc"
                };

                function onColumnSort(event) {
                    var $cell = $(event.currentTarget),
                        columnId = $.mettleDataGrid.getElementId(event.currentTarget.id),
                        direction;

                    $mettleDataGrid
                        .find(".mettleDataGrid-heading .sortable-column")
                        .not($cell)
                        .removeClass("asc desc")
                        .removeData("direction");

                    direction = $cell.data("direction");
                    if (!direction) {
                        direction = SortDirection.ASC;
                    } else if (direction === SortDirection.ASC) {
                        direction = SortDirection.DESC;
                    } else {
                        direction = SortDirection.ASC;
                    }
                    $cell.data("direction", direction);
                    $cell.removeClass("asc desc").addClass(direction);
                    options.onSort(columnId, direction);
                }

                function load(helper) {
                    if (!options.isGridSortable) {
                        return;
                    }

                    if (options.sortBy) {
                        var $column = $mettleDataGrid.find("#" + options.id + "Col_" + options.sortBy.column);
                        $column.addClass(options.sortBy.direction);
                        $column.data("direction", options.sortBy.direction);
                    }

                    $.each(options.columns, function (index, column) {
                        if ($.mettleDataGrid.renderer[column.type] && $.mettleDataGrid.renderer[column.type].headerSortArrow) {
                            var headerSortArrow = $.mettleDataGrid.renderer[column.type].headerSortArrow;
                            if (headerSortArrow) {
                                headerSortArrow($mettleDataGrid, column, options.columns, helper.getColumnElementById(column.id, options));
                            }
                        } else {
                            if (column.isSortable !== false) {
                                helper.getColumnElementById(column.id, options)
                                    .append("<span class='sort-arrow'></span>")
                                    .addClass("sortable-column");
                            }
                        }
                    });

                    undelegate($mettleDataGrid);
                    $mettleDataGrid
                        .delegate(".mettleDataGrid-heading .sortable-column", "click", onColumnSort)
                        .delegate(".mettleDataGrid-heading .sortable-column", "mouseenter", function () {
                            $(this).addClass("sort-hover");
                        })
                        .delegate(".mettleDataGrid-heading .sortable-column", "mouseleave", function () {
                            $(this).removeClass("sort-hover");
                        });
                }

                function undelegate($mettleDataGrid) {
                    $mettleDataGrid.undelegate(".mettleDataGrid-heading .sortable-column", "click");
                    $mettleDataGrid.undelegate(".mettleDataGrid-heading .sortable-column", "mouseleave");
                    $mettleDataGrid.undelegate(".mettleDataGrid-heading .sortable-column", "mouseenter");
                }

                function destroy() {
                    undelegate($mettleDataGrid);
                    options = null;
                }

                return {
                    load: load,
                    destroy: destroy
                };
            }
        }
    });

}(jQuery));