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
            columnResize: function ($mettleDataGrid, options) {
                options = $.extend({
                    isGridColumnResizable: true,
                    onColumnResize: $.noop,
                    minColumnWidth: 30,
                    maxColumnWidth: 700
                }, options);

                var columns = options.columns;

                function load(helper) {
                    if (!options.isGridColumnResizable) {
                        return;
                    }

                    $.each(options.columns, function (index, column) {
                        if (column.isResizable !== false) {
                            helper.getColumnElementById(column.id, options)
                                .append("<span class='resize-handle'></span>")
                                .addClass("resizable-column");
                        }
                    });


                    var $headingRow = $mettleDataGrid.find(".mettleDataGrid-heading");

                    undelegateEvents();

                    $headingRow.delegate(".resize-handle", "click", function () {
                        return false;
                    });

                    $headingRow.delegate(".resize-handle", "mousedown", function () {
                        var $cell = $(this).parents(".cell").eq(0);
                        var $resizeHandle = $(this);
                        var columnId = $.mettleDataGrid.getElementId($cell.attr("id")),
                            posX,
                            originalWidth,
                            $guide,
                            newWidth;
                        $guide = $("<div class='resize-guide'></div>");
                        $guide.css({
                            height: $mettleDataGrid.height(),
                            top: 0,
                            left: $resizeHandle.offset().left - $mettleDataGrid.offset().left + $resizeHandle.width()
                        });
                        $mettleDataGrid.append($guide);
                        originalWidth = $cell.width();
                        posX = event.screenX;

                        $(document).bind("mousemove.mettleDataGridResizeGuide", function (event) {
                            newWidth = originalWidth + (event.screenX - posX);
                            if (newWidth <= options.minColumnWidth) {
                                newWidth = options.minColumnWidth;
                            } else if (newWidth >= options.maxColumnWidth) {
                                newWidth = options.maxColumnWidth;
                            }
                            $guide.css({
                                left: $resizeHandle.offset().left - $mettleDataGrid.offset().left + $resizeHandle.width()
                            });
                            $cell.width(newWidth);
                            options.columns[options.columnsHashMap[columnId]].width = newWidth;
                            return false;
                        });

                        $(document).bind("mouseup.mettleDataGridResizeGuide", function () {
                            $(document).unbind("mousemove.mettleDataGridResizeGuide mouseup.mettleDataGridResizeGuide");
                            $guide.unbind();
                            $guide.remove();
                            posX = null;
                            $mettleDataGrid.find(".mettleDataGrid-rows ." + columnId).width(newWidth);
                            $mettleDataGrid.find(".mettleDataGrid-filter ." + columnId).width(newWidth);
                            options.onColumnResize(columnId, originalWidth, newWidth);
                            $mettleDataGrid.trigger($.mettleDataGrid.adjustRowWidth);
                            return false;
                        });
                        return false;
                    });

                }


                function undelegateEvents() {
                    var $headingRow = $mettleDataGrid.find(".mettleDataGrid-heading");
                    $headingRow.undelegate(".resize-handle", "mousedown");
                    $headingRow.undelegate(".resize-handle", "click");
                }

                function destroy() {
                    undelegateEvents();
                    columns = null;
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