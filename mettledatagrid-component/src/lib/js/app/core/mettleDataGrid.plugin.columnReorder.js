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

    var START_SCROLL_PROXIMITY = 100;

    var DIRECTION = {
        LEFT: "LEFT",
        RIGHT: "RIGHT"
    };

    $.mettleDataGrid = $.extend(true, $.mettleDataGrid, {
        plugin: {
            columnReorder: function ($mettleDataGrid, options) {

                var gridWidth, gridLeftOffset, $rowsContainer, $headingContainer;
                var direction = DIRECTION.RIGHT;

                options = $.extend({
                    isGridColumnReorderable: true,
                    onColumnReorder: $.noop
                }, options);

                function onColumnReorderDrop(event, ui) {
                    onColumnReordered(event, ui, options, $mettleDataGrid, direction);
                }

                function onReorderOver(event) {
                    onColumnReorderOver($(event.target), direction);
                }

                function load() {
                    if (!options.isGridColumnReorderable) {
                        return;
                    }
                    gridLeftOffset = $mettleDataGrid.offset().left;
                    gridWidth = $mettleDataGrid.width();
                    $rowsContainer = $mettleDataGrid.find(".mettleDataGrid-rows");
                    $headingContainer = $mettleDataGrid.find(".mettleDataGrid-heading");
                    var cellSelector = ".mettleDataGrid-heading .cell";
                    var scrollInterval, scrollLeftBy;

                    $mettleDataGrid.delegate(cellSelector, "dragstop", function () {
                        $mettleDataGrid.undelegate(".mettleDataGrid-heading .cell", "mouseout.reorder");
                        $mettleDataGrid.undelegate(".mettleDataGrid-heading .cell", "mousemove.reorder");
                        window.clearInterval(scrollInterval);
                    });

                    $mettleDataGrid.delegate(cellSelector, "dragstart", function (e) {
                        window.clearInterval(scrollInterval);
                        var currentTarget = e.currentTarget;
                        $mettleDataGrid.delegate(".mettleDataGrid-heading .cell", "mousemove.reorder", function (e) {
                            if (e.currentTarget.id !== currentTarget.id) {
                                direction = (e.clientX < ($(this).offset().left + ($(this).width() / 2))) ? DIRECTION.LEFT : DIRECTION.RIGHT;
                                onColumnReorderOver($(this), direction);
                            }
                        });
                        $mettleDataGrid.delegate(".mettleDataGrid-heading .cell", "mouseout.reorder", function () {
                            $(this).removeClass("reorder-left reorder-right");
                        });
                    });


                    $mettleDataGrid.delegate(cellSelector, "drag", function (event) {
                        if (event.clientX > (gridLeftOffset - START_SCROLL_PROXIMITY) && event.clientX < (gridLeftOffset + START_SCROLL_PROXIMITY)) {
                            window.clearInterval(scrollInterval);
                            scrollLeftBy = $rowsContainer[0].scrollLeft;
                            scrollInterval = window.setInterval(function () {
                                if ($rowsContainer[0].scrollLeft > 0) {
                                    $rowsContainer[0].scrollLeft -= 10;
                                }
                            }, 50);
                        } else if (event.clientX > (gridLeftOffset + gridWidth - START_SCROLL_PROXIMITY) && event.clientX < (gridLeftOffset + gridWidth + START_SCROLL_PROXIMITY)) {
                            window.clearInterval(scrollInterval);
                            scrollLeftBy = $rowsContainer[0].scrollLeft + $headingContainer.width() + 100;
                            scrollInterval = window.setInterval(function () {
                                if ($rowsContainer[0].scrollLeft < scrollLeftBy) {
                                    $rowsContainer[0].scrollLeft += 10;
                                }
                            }, 50);
                        } else {
                            window.clearInterval(scrollInterval);
                        }
                    });

                    if ($.fn.droppable) {
                        $mettleDataGrid.find(cellSelector).droppable({
                            drop: onColumnReorderDrop,
                            over: onReorderOver,
                            out: onColumnReorderOut,
                            accept: cellSelector,
                            tolerance: "pointer"
                        });
                    }

                    options.makeColumnDraggable($mettleDataGrid);
                }

                function update() {
                    gridLeftOffset = $mettleDataGrid.offset().left;
                    gridWidth = $mettleDataGrid.width();
                    $rowsContainer = $mettleDataGrid.find(".mettleDataGrid-rows");
                    $headingContainer = $mettleDataGrid.find(".mettleDataGrid-heading");
                }

                function destroy() {
                    options = null;
                    if ($.fn.droppable) {
                        $mettleDataGrid.find(".mettleDataGrid-heading .cell").droppable("destroy");
                    }
                    $mettleDataGrid.undelegate(".mettleDataGrid-heading .cell", "drag");
                    $mettleDataGrid.undelegate(".mettleDataGrid-heading .cell", "dragstop");
                    $rowsContainer = null;
                    $headingContainer = null;
                }

                return {
                    load: load,
                    update: update,
                    destroy: destroy
                };
            }
        }
    });

    function onColumnReordered(event, ui, options, $mettleDataGrid, direction) {
        var $ele = $(event.target);
        $ele.removeClass("reorder-left reorder-right");
        var columnIdToMove = $.mettleDataGrid.getElementId(ui.draggable.attr("id")),
            columnIdToMoveAfter = $.mettleDataGrid.getElementId($ele.attr("id")),
            newColumnOrder = [];
        $.each(options.columns, function (i, column) {
            if (column.id !== columnIdToMove) {
                newColumnOrder.push(column.id);
            }
            if (column.id === columnIdToMoveAfter) {
                if (direction === DIRECTION.RIGHT) {
                    newColumnOrder.push(columnIdToMove);
                } else {
                    newColumnOrder.splice((newColumnOrder.length - 1), 0, columnIdToMove);
                }
            }
        });
        $mettleDataGrid.removeClass("mettleDataGrid-initialized");
        options.onColumnReorder(newColumnOrder);
    }

    function onColumnReorderOver($ele, direction) {
        $ele.removeClass("reorder-left reorder-right").addClass(direction === DIRECTION.LEFT ? "reorder-left" : "reorder-right");
    }

    function onColumnReorderOut(event) {
        $(event.target).removeClass("reorder-left reorder-right");
    }

}(jQuery));