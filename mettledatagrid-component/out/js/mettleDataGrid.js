/*!
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

/*!
 * @author Manish Shanker
 * @buildTimestamp 15022014231411
 */

(function ($) {
    "use strict";

    var MettleDataGrid = function (options) {

        var defaultOptions = {
            id: null,
            dataSource: null,
            statePersist: $.statePersistToCookie,
            isGridGroupable: true,
            isGridSortable: true,
            groupsPlaceHolder: "." + options.id + "-mettleDataGrid-group-by",
            columnWidthOverride: null,
            pageSize: null,
            mettleDataGridSelector: "#" + options.id,
            onRowClick: $.noop,
            onSort: onSortBy,
            onGroupChange: onGroupBy,
            onGroupReorder: onGroupReorder,
            onFilter: onFilterBy,
            onColumnReorder: onColumnReorder,
            onColumnResize: onColumnResize,
            onScrollToBottom: fetchRowsIncrementally,
            onStateChange: $.noop,
            onReset: resetAndRefresh,
            onRefresh: refresh,
            onGridDataLoaded: $.noop,
            groupBy: [],
            clientCache: false
        };

        options = $.extend(true, {}, defaultOptions, options);

        var $mettleDataGrid = $();

        var store = new MettleDataGrid.DataStore(options.dataSource, options.clientCache),
            loadedRows = 0,
            totalRows = 0,
            pageSize = 0,
            columnData = null,
            mettleDataGridCurrentStateData;

        function render(data) {
            columnData = data.columns;
            totalRows = data.totalRows;
            loadedRows = data.rows.length;
            pageSize = data.pageSize || options.pageSize;
            data.columnWidthOverride = data.columnWidthOverride || mettleDataGridCurrentStateData.columnWidthOverride;
            if (data.groupBy && data.groupBy.length) {
                data.groupBy = $.map(data.groupBy, function (column) {
                    return column.id;
                });
            }
            if (data.sortBy && data.sortBy.length) {
                data.sortBy = {
                    column: data.sortBy[0].id,
                    direction: data.sortBy[0].direction
                };
            }
            renderData(data);
            mettleDataGridCurrentStateData.columnOrder = $.map(data.columns, function (column) {
                return column.id;
            });
            mettleDataGridCurrentStateData.hiddenColumns = data.hiddenColumns;
            saveStateOfCurrentGrid();
            $mettleDataGrid.trigger($.mettleDataGrid.hideLoading);
        }

        function saveStateOfCurrentGrid() {
            if (options.statePersist) {
                options.statePersist.save("mettleDataGridState_" + options.id, JSON.stringify(mettleDataGridCurrentStateData));
            }
            options.onStateChange(mettleDataGridCurrentStateData);
        }

        function getCurrentState(callback) {
            if (options.statePersist) {
                options.statePersist.load("mettleDataGridState_" + options.id, function (data) {
                    callback(JSON.parse(data));
                });
            } else {
                callback({});
            }
        }

        function fetchRowsIncrementally() {
            //This can be fetched from the serve
            if (loadedRows >= totalRows) {
                return;
            }
            var requestData = $.extend({}, mettleDataGridCurrentStateData, {
                pageOffset: loadedRows + 1,
                pageSize: pageSize
            });
            $mettleDataGrid.trigger($.mettleDataGrid.showLoading);
            store.fetchRows(requestData, onReceiveOfNewRows);
        }

        function onReceiveOfNewRows(newRows) {
            mettleDataGridCurrentStateData = mettleDataGridCurrentStateData || {};
            loadedRows += newRows.rows.length;
            addNewRows(newRows);
            $mettleDataGrid.trigger($.mettleDataGrid.hideLoading);
        }

        function onReceiveOfData(data) {
            mettleDataGridCurrentStateData = mettleDataGridCurrentStateData || {};
            mettleDataGridCurrentStateData.pageSize = options.pageSize = data.pageSize || mettleDataGridCurrentStateData.pageSize;
            mettleDataGridCurrentStateData = $.extend(true, mettleDataGridCurrentStateData, data.state);
            render(data);
        }

        function onFilterBy(filters) {
            mettleDataGridCurrentStateData.filterBy = filters;
            $mettleDataGrid.trigger($.mettleDataGrid.showLoading);
            store.filter(mettleDataGridCurrentStateData, render);
        }

        function onGroupBy(columnIds) {
            var newColumnOrder;
            if (mettleDataGridCurrentStateData.columnOrder) {
                newColumnOrder = [];
                $.each(columnIds, function (i, value) {
                    newColumnOrder.push(value);
                });
                $.each(mettleDataGridCurrentStateData.columnOrder, function (i, value) {
                    if (newColumnOrder.indexOf(value) < 0) {
                        newColumnOrder.push(value);
                    }
                });
                mettleDataGridCurrentStateData.columnOrder = newColumnOrder;
            }
            mettleDataGridCurrentStateData.groupBy = columnIds.length ? $.map(columnIds, function (columnId) {
                var column = getColumnById(columnId).column;
                return {
                    id: columnId,
                    type: column.type || column.renderer || null,
                    direction: "desc"
                };
            }) : [];
            $mettleDataGrid.trigger($.mettleDataGrid.showLoading);
            store.groupBy(mettleDataGridCurrentStateData, render);
        }

        function onSortBy(columnId, direction) {
            var column = getColumnById(columnId).column;
            mettleDataGridCurrentStateData.sortBy = [
                {
                    id: columnId,
                    type: column.type || column.renderer || null,
                    direction: direction
                }
            ];
            $mettleDataGrid.trigger($.mettleDataGrid.showLoading);
            store.sortBy(mettleDataGridCurrentStateData, render);
        }

        function onColumnReorder(newColumnOrder) {
            var groupByColumnsLength, newGroupByColumns, n, foundColumn;

            if (mettleDataGridCurrentStateData.groupBy && mettleDataGridCurrentStateData.groupBy.length) {
                groupByColumnsLength = mettleDataGridCurrentStateData.groupBy.length;
                newGroupByColumns = [];
                for (n = 0; n < groupByColumnsLength; n += 1) {
                    foundColumn = getColumnById(newColumnOrder[n]);
                    if (foundColumn.column.isGroupable) {
                        newGroupByColumns.push(newColumnOrder[n]);
                    } else {
                        break;
                    }
                }
                mettleDataGridCurrentStateData.groupBy = $.map(newGroupByColumns, function (column) {
                    return {id: column, direction: "desc"};
                });
            }
            mettleDataGridCurrentStateData.columnOrder = newColumnOrder;
            $mettleDataGrid.trigger($.mettleDataGrid.showLoading);
            store.reorderColumn(mettleDataGridCurrentStateData, render);
        }

        function getColumnById(columnId) {
            var foundIndex = -1,
                column = $.grep(columnData, function (column, index) {
                    if (column.id === columnId) {
                        foundIndex = index;
                        return true;
                    }
                    return false;
                })[0];
            return {
                column: column,
                index: foundIndex
            };
        }

        function onGroupReorder(newGroupOrder) {
            onGroupBy(newGroupOrder);
        }

        //noinspection JSUnusedLocalSymbols
        function onColumnResize(columnId, oldWidth, newWidth) {
            mettleDataGridCurrentStateData.columnWidthOverride = mettleDataGridCurrentStateData.columnWidthOverride || {};
            mettleDataGridCurrentStateData.columnWidthOverride[columnId] = newWidth;
            saveStateOfCurrentGrid();
        }

        function load(overrideState) {
            getCurrentState(function (currentStateData) {
                mettleDataGridCurrentStateData = overrideState || currentStateData || {};
                if (options.pageSize) {
                    mettleDataGridCurrentStateData.pageSize = options.pageSize;
                }
                store.load(mettleDataGridCurrentStateData, onReceiveOfData);
            });
        }

        function destroy() {
            $mettleDataGrid.unbind($.mettleDataGrid.renderingComplete);
            gridViewRefresh();
            if (store) {
                store.destroy();
                store = null;
            }
        }

        function refresh() {
            $mettleDataGrid.trigger($.mettleDataGrid.destroy);
            $mettleDataGrid.removeClass("mettleDataGrid-initialized");
            if (store) {
                store.refresh(mettleDataGridCurrentStateData, onReceiveOfData);
            }
        }

        function gridViewRefresh() {
            if (options.statePersist) {
                options.statePersist.save("mettleDataGridState_" + options.id, null);
            }
            mettleDataGridCurrentStateData = {};
            mettleDataGridCurrentStateData.pageSize = options.pageSize;
            $mettleDataGrid.trigger($.mettleDataGrid.destroy);
            $mettleDataGrid.removeClass("mettleDataGrid-initialized");
        }

        function resetAndRefresh(overrideState) {
            options.groupBy = [];
            options.state = {};
            options.columnWidthOverride = null;
            options.sortBy = [];
            options.filterBy = [];
            gridViewRefresh();
            mettleDataGridCurrentStateData = overrideState || null;
            if (store) {
                store.refresh(mettleDataGridCurrentStateData, onReceiveOfData);
            }
        }

        function getSource() {
            return options.dataSource;
        }

        function getCurrentMetaData() {
            return store.getCurrentMetaData();
        }

        function renderData(data) {
            var mettleDataGridData = $.extend(options, data);
            $mettleDataGrid = $(options.mettleDataGridSelector);
            $mettleDataGrid.bind($.mettleDataGrid.renderingComplete, options.onGridDataLoaded);
            $mettleDataGrid.mettleDataGrid(mettleDataGridData);
        }

        function addNewRows(newData) {
            $mettleDataGrid.trigger($.mettleDataGrid.appendRows, [newData.rows, mettleDataGridCurrentStateData.columnWidthOverride]);
        }

        function getDefaultOptions() {
            return defaultOptions;
        }

        function getCurrentOptions() {
            return $.extend({}, options);
        }

        return $.extend({}, MettleDataGrid.extension, {
            load: load,
            destroy: destroy,
            refresh: refresh,
            resetAndRefresh: resetAndRefresh,
            getDefaultOptions: getDefaultOptions,
            getCurrentOptions: getCurrentOptions,
            getCurrentMetaData: getCurrentMetaData,
            getSource: getSource
        });
    };

    MettleDataGrid.extension = {};

    window.MettleDataGrid = MettleDataGrid;

}(jQuery));
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

    if (!$.browser) {
        var browserVersion = /MSIE(.*?);/.exec(navigator.appVersion);
        $.browser = {
            msie: navigator && navigator.appName.indexOf("Microsoft") > -1,
            version: browserVersion && browserVersion[1]
        };
    }

    if ($.browser.msie && parseInt($.browser.version, 10) <= 7 && document.documentMode !== 8) {
        $("html").addClass("ie7below");
    }

    $.mettleDataGrid = $.extend($.mettleDataGrid, {
        appendRows: "mettleDataGrid-append-rows",
        destroy: "mettleDataGrid-destroy",
        renderingComplete: "mettleDataGrid-rendering-complete",
        adjustRowWidth: "mettleDataGrid-adjust-row-width",
        showLoading: "mettleDataGrid-showLoading",
        hideLoading: "mettleDataGrid-hideLoading",
        getElementId: function (id) {
            var ids = id.split("_");
            ids.splice(0, 1);
            return ids.join("_");
        }
    });

    $.mettleDataGrid.renderer = {};
    $.mettleDataGrid.filter = {};

    $.mettleDataGrid.plugin = $.mettleDataGrid.plugin || {};

    var gridPluginMap = {};

    var scrollBottomTimer;

    var TOTAL_ROW_LABEL_TEMPLATE = "<div class='total-row-count'>Showing {loadedRows} of {totalRows}</div>",
        GROUP_CONTAINER_WRAPPER_TEMPLATE = "<div class='group-data'></div>",
        HEADING_ROW_TEMPLATE = "<div class='mettleDataGrid-heading'></div>",
        HEADING_ROW_COLUMN_HELPER_TEMPLATE = "<div class='{cssClass} column-helper'></div>",
        HEADING_ROW_CONTAINER_TEMPLATE = "<div class='mettleDataGrid-head'></div>",
        HEADING_ROW_CELL_TEMPLATE = "<div class='cell {columnId} {cssClass}' id='{id}'><span class='label'>{value}</span></div>",
        GROUP_HEADING_TEMPLATE = "<div class='group level{level}'><div class='group-header group-header-row'><span class='open-close-indicator'>-</span></div></div>",
        ROW_TEMPLATE = "<div class='row level{level}' id='{id}'></div>",
        CELL_TEMPLATE = "<div class='cell {columnId} {cssClass} {spacerClass}'>{value}</div>",
        ROWS_CONTAINER_TEMPLATE = "<div class='mettleDataGrid-rows'><div class='mettleDataGrid-rows-content'></div></div>",
        LOADING_MESSAGE = "<div class='loading-message'>Loading...</div>";

//    var TOTAL_ROW_LABEL_TEMPLATE = "<div class='total-row-count'>Showing {loadedRows} of {totalRows}</div>",GROUP_CONTAINER_WRAPPER_TEMPLATE = "<table class='group-data'></table>",HEADING_ROW_TEMPLATE = "<tr class='mettleDataGrid-heading'></tr>",HEADING_ROW_COLUMN_HELPER_TEMPLATE = "<div class='{cssClass} column-helper'></div>",HEADING_ROW_CONTAINER_TEMPLATE = "<thead class='mettleDataGrid-head'></thead>",HEADING_ROW_CELL_TEMPLATE = "<td class='cell {cssClass}' id='{id}'>{value}<span class='sort-arrow'></span></td>",GROUP_HEADING_TEMPLATE = "<tr class='group level{level}'><tboby><tr class='group-header'><table><tr><td><span class='open-close-indicator'>-</span>{value}</td></tr></table></tbody></tr>",ROW_TEMPLATE = "<tr class='row level{level}' id='{id}'></tr>",CELL_TEMPLATE = "<td class='cell {columnId} {cssClass}'>{value}</td>",ROWS_CONTAINER_TEMPLATE = "<table class='mettleDataGrid-rows'><tbody class='mettleDataGrid-rows-content'></tbody></table>",LOADING_MESSAGE = "<div class='loading-message'>Loading...</div>";

    var DATA_ROW_KEY = "DataRow_";
    var HEADER_COL_KEY = "Col_";

    $.fn.mettleDataGrid = function (options) {

        options = $.extend({
            id: null,
            rows: [],
            columns: [],
            rowHover: true,
            onRowClick: null,
            onScrollToBottom: $.noop,
            columnWidthOverride: null,
            makeColumnDraggable: makeColumnDraggable,
            showTotalRows: true,
            groupDetails: null,
            groupDetailsInFirstColumnOnly: true,
            totalRowLabelTemplate: TOTAL_ROW_LABEL_TEMPLATE,
            loadingMessage: LOADING_MESSAGE
        }, options);

        var plugins = {};

        if (!(options.id && /^[a-zA-Z0-9]*$/.test(options.id))) {
            throw "You need to provide id for the mettleDataGrid and ensure that the id don't have any special characters in it.";
        }

        return this.each(function () {
            var $mettleDataGrid = $(this);
            var groupDetails = options.groupDetails;

            updateColumnHashMap(options);
            updateColumnWidth(options);

            //if (this.tagName !== "TABLE") {var prop = {id:$mettleDataGrid.attr("id"),class:$mettleDataGrid.attr("class"),cellSpacing:0,cellPadding:0};var $table = $("<table></table>").attr(prop);$mettleDataGrid.replaceWith($table);$mettleDataGrid = $table;}

            var cachedGridData = {},
                $head,
                rowsAndGroup = renderRowsAndGroups(options, cachedGridData, groupDetails),
                $rows = rowsAndGroup.$rowsMainContainer,
                countOfLoadedRows = options.rows.length,
                rowWidth;

            if ($mettleDataGrid.hasClass("mettleDataGrid-initialized")) {
                $rows = $mettleDataGrid.find(".mettleDataGrid-rows").empty().append($rows.children());
                rowsAndGroup.$rowsMainContainer = $rows;
                $head = $mettleDataGrid.find(".mettleDataGrid-head");
            } else {
                $mettleDataGrid.trigger($.mettleDataGrid.destroy);
                $head = renderHeading($mettleDataGrid, options).wrap(HEADING_ROW_CONTAINER_TEMPLATE).parent();
                $mettleDataGrid.addClass("mettleDataGrid").empty().append($head.add($rows));
                if (options.showTotalRows) {
                    $mettleDataGrid.append(options.totalRowLabelTemplate.supplant({
                        totalRows: "",
                        loadedRows: ""
                    }));
                }
                $mettleDataGrid.append(options.loadingMessage);
                $rows.bind("scroll.mettleDataGrid", function () {
                    onMettleDataGridScroll($head, $rows, options);
                    $mettleDataGrid.data("lastScrollPos", $rows[0].scrollLeft);
                });
                $mettleDataGrid.unbind($.mettleDataGrid.hideLoading).bind($.mettleDataGrid.hideLoading, function () {
                    $mettleDataGrid.find(".loading-message").hide();
                });
                $mettleDataGrid.unbind($.mettleDataGrid.showLoading).bind($.mettleDataGrid.showLoading, function () {
                    $mettleDataGrid.find(".loading-message").show();
                });
            }

            //Fix for the grid width issue
            adjustRowWidth();

            if ($rows && $rows.length) {
                $rows[0].scrollLeft = $mettleDataGrid.data("lastScrollPos");
            }

            function destroy() {
                destroyPlugins(plugins, options);
                unbindGridEvents($mettleDataGrid, $head, $rows);
                $head = null;
                rowsAndGroup = null;
                $rows = null;
                options = null;
                $mettleDataGrid = null;
                cachedGridData = null;
            }

            $mettleDataGrid.unbind($.mettleDataGrid.destroy).bind($.mettleDataGrid.destroy, destroy);

            //noinspection JSUnusedLocalSymbols
            function onRowAppend(event, newRows, columnWidthOverride) {
                countOfLoadedRows = addFetchedRow(newRows, countOfLoadedRows, $mettleDataGrid, options, columnWidthOverride, rowsAndGroup, cachedGridData, rowWidth, groupDetails);
            }

            $mettleDataGrid.unbind($.mettleDataGrid.appendRows).bind($.mettleDataGrid.appendRows, onRowAppend);

            function adjustRowWidth() {
                var gridRowWidth = 0;
                $head.find(".mettleDataGrid-heading .cell:visible").each(function () {
                    gridRowWidth += $(this).outerWidth(true);
                });
                $mettleDataGrid.find(".mettleDataGrid-rows-content").css({minHeight: 1, overflow: "hidden", width: gridRowWidth});
            }

            $mettleDataGrid.unbind($.mettleDataGrid.adjustRowWidth).bind($.mettleDataGrid.adjustRowWidth, adjustRowWidth);

            if (options.rowHover) {
                $mettleDataGrid.undelegate(".mettleDataGrid-rows .row", "mouseenter").undelegate(".mettleDataGrid-rows .row", "mouseleave").delegate(".mettleDataGrid-rows .row", "mouseenter", function () {
                    $(this).addClass("row-hover");
                }).delegate(".mettleDataGrid-rows .row", "mouseleave", function () {
                    $(this).removeClass("row-hover");
                });
            }

            if (options.onRowClick) {
                $mettleDataGrid.undelegate(".mettleDataGrid-rows .row", "click").delegate(".mettleDataGrid-rows .row", "click", function () {
                    var rowId = $.mettleDataGrid.getElementId($(this).attr("id"));
                    options.onRowClick(cachedGridData[rowId].orig || cachedGridData[rowId], $(this));
                });
            }

            updateCountLabel($mettleDataGrid, options, countOfLoadedRows);

            var helper = {
                getColumnElementById: getColumnElementById,
                getRowElementById: getRowElementById,
                getColumnById: getColumnById,
                getCellContent: getCellContent
            };

            $.each($.mettleDataGrid.plugin, function (key, plugin) {
                if ($mettleDataGrid.hasClass("mettleDataGrid-initialized")) {
                    plugins[key] = gridPluginMap[options.id][key];
                    if (plugins[key].update) {
                        plugins[key].update(cachedGridData);
                    }
                } else {
                    gridPluginMap[options.id] = gridPluginMap[options.id] || {};
                    gridPluginMap[options.id][key] = plugins[key] = plugin($mettleDataGrid, options, cachedGridData);
                    plugins[key].load(helper);
                }
            });

            $mettleDataGrid.addClass("mettleDataGrid-initialized");
            $mettleDataGrid.trigger($.mettleDataGrid.renderingComplete);

        });

    };

    function unbindGridEvents($mettleDataGrid, $head, $rows) {
        if ($.draggable) {
            $mettleDataGrid.find(".mettleDataGrid-heading .cell").draggable("destroy");
        }
        $head.undelegate().unbind().empty().remove();
        $rows.undelegate().unbind().remove();
        removeColumnDraggable($mettleDataGrid);
        $mettleDataGrid
            .unbind($.mettleDataGrid.hideLoading)
            .unbind($.mettleDataGrid.showLoading)
            .unbind($.mettleDataGrid.adjustRowWidth)
            .unbind($.mettleDataGrid.destroy)
            .unbind($.mettleDataGrid.appendRows)
            .undelegate(".group .group-header", "click")
            .undelegate(".mettleDataGrid-rows .row", "click")
            .undelegate(".mettleDataGrid-rows .row", "mouseenter")
            .undelegate(".mettleDataGrid-rows .row", "mouseleave")
            .empty();
        $mettleDataGrid.data("mettleDataGridColumnDraggable", false);
    }

    function addFetchedRow(newRows, countOfLoadedRows, $mettleDataGrid, options, columnWidthOverride, rowsAndGroup, cachedGridData, rowWidth, groupDetails) {
        countOfLoadedRows += newRows.length;
        updateCountLabel($mettleDataGrid, options, countOfLoadedRows);
        options.columnWidthOverride = columnWidthOverride;
        updateColumnWidth(options);
        var $groupContainers = rowsAndGroup.lastGroupInformation.$groupContainers,
            currentGroupValues = rowsAndGroup.lastGroupInformation.currentGroupValues,
            $rowsMainContainer = rowsAndGroup.$rowsMainContainer,
            isStartRowEven = $rowsMainContainer.find(".row:last").hasClass("even");
        rowsAndGroup.lastGroupInformation = addRows({
            tableId: options.id,
            rows: newRows,
            columns: options.columns,
            groups: options.groupBy,
            $rowMainContainer: $rowsMainContainer.find(".mettleDataGrid-rows-content"),
            $groupContainers: $groupContainers,
            currentGroupValues: currentGroupValues,
            isStartEven: isStartRowEven,
            cachedGridData: cachedGridData,
            rowWidth: rowWidth,
            groupDetails: groupDetails,
            areFetchedRows: true,
            groupDetailsInFirstColumnOnly: options.groupDetailsInFirstColumnOnly
        });
        if ($mettleDataGrid.find(".mettleDataGrid-rows")[0].scrollHeight <= $mettleDataGrid.find(".mettleDataGrid-rows").height()) {
            options.onScrollToBottom();
        }
        return countOfLoadedRows;
    }

    function destroyPlugins(plugins, options) {
        $.each(plugins, function (key, plugin) {
            if (plugin.destroy) {
                plugin.destroy();
            }
        });
        delete gridPluginMap[options.id];
    }

    function onMettleDataGridScroll($head, $rows, options) {
        var eleRow = $rows[0];
        $head.css({
            marginLeft: -1 * eleRow.scrollLeft
        });
        clearTimeout(scrollBottomTimer);
        scrollBottomTimer = setTimeout(function () {
            var scrolled = (eleRow.scrollHeight - $rows.scrollTop()),
                containerHeight = $rows.height();
            if ((scrolled <= (containerHeight - 17)) || (scrolled <= containerHeight)) {
                options.onScrollToBottom();
            }
        }, 100);
    }

    function updateCountLabel($mettleDataGrid, options, countOfLoadedRows) {
        if (options.showTotalRows) {
            $mettleDataGrid.find(".total-row-count").replaceWith(options.totalRowLabelTemplate.supplant({
                totalRows: options.totalRows,
                loadedRows: countOfLoadedRows
            }));
        }
    }

    function updateColumnWidth(options) {
        if (options.columnWidthOverride) {
            $.each(options.columnWidthOverride, function (columnId, width) {
                if (options.columnsHashMap[columnId]) {
                    options.columns[options.columnsHashMap[columnId]].width = width;
                }
            });
        }
    }

    function updateColumnHashMap(options) {
        options.columnsHashMap = {};
        $.each(options.columns, function (i, column) {
            options.columnsHashMap[column.id] = i;
        });
    }

    function getRowElementById(rowId, options) {
        return $("#" + options.id + DATA_ROW_KEY + rowId);
    }

    function getColumnElementById(columnId, options) {
        return $("#" + options.id + HEADER_COL_KEY + columnId);
    }

    function makeColumnDraggable($mettleDataGrid) {
        if (!$mettleDataGrid.data("mettleDataGridColumnDraggable")) {
            if ($.fn.draggable) {
                $mettleDataGrid.find(".mettleDataGrid-heading .cell").draggable({
                    helper: function (event) {
                        return getHelper(event, $mettleDataGrid.attr("class"));
                    },
                    revert: false,
                    cancel: ".resize-handle",
                    appendTo: "body",
                    refreshPositions: true,
                    cursorAt: { top: 0, left: 0 }
                });
            }
            $mettleDataGrid.data("mettleDataGridColumnDraggable", true);
        }
    }

    function removeColumnDraggable($mettleDataGrid) {
        if ($.fn.draggable) {
            $mettleDataGrid.find(".mettleDataGrid-heading .cell").draggable("destroy");
        }
        $mettleDataGrid.removeData("mettleDataGridColumnDraggable");
    }

    function getHelper(event, cssClass) {
        return $(event.currentTarget).clone(false).wrap(HEADING_ROW_TEMPLATE).parent().wrap(HEADING_ROW_COLUMN_HELPER_TEMPLATE.supplant({
            cssClass: cssClass
        })).parent().css("width", "auto");
    }

    function renderHeading($mettleDataGrid, options) {
        return headingRowElementsRenderer($mettleDataGrid, options.columns, {
            container: HEADING_ROW_TEMPLATE,
            cell: HEADING_ROW_CELL_TEMPLATE,
            cellContent: function (column) {
                return {
                    value: column.label,
                    id: options.id + HEADER_COL_KEY + column.id,
                    cssClass: column.type || column.renderer || "",
                    columnId: column.id
                };
            }
        }, options.id);
    }

    function headingRowElementsRenderer($mettleDataGrid, columns, template, gridId) {
        var $row = $(template.container),
            colCount = columns.length;
        $.each(columns, function (i, column) {
            if (column.render !== false) {
                var templateData = template.cellContent(column),
                    $cell;
                templateData.cssClass = templateData.cssClass + (i === colCount - 1 ? " last" : "") + (i === 0 ? " first" : "");
                if ($.mettleDataGrid.renderer[column.type] && $.mettleDataGrid.renderer[column.type].headerCell) {
                    templateData.value = $.mettleDataGrid.renderer[column.type].headerCell($mettleDataGrid, column, columns, gridId);
                }
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

    function renderRowsAndGroups(options, cachedGridData, groupDetails) {
        var $rowsMainContainer = $(ROWS_CONTAINER_TEMPLATE),
            lastGroupInformation = addRows({
                tableId: options.id,
                rows: options.rows,
                columns: options.columns,
                groups: options.groupBy,
                $rowMainContainer: $rowsMainContainer.find(".mettleDataGrid-rows-content"),
                $groupContainers: null,
                currentGroupValues: [],
                isStartEven: false,
                cachedGridData: cachedGridData,
                rowWidth: null,
                groupDetails: groupDetails,
                areFetchedRows: false,
                groupDetailsInFirstColumnOnly: options.groupDetailsInFirstColumnOnly
            });
        return {
            $rowsMainContainer: $rowsMainContainer,
            lastGroupInformation: lastGroupInformation
        };
    }

    function getColumnById(id, columns) {
        return $.grep(columns, function (col) {
            return col.id === id;
        })[0];
    }

    function getGroupDetailByRefLabel(refLabel, groupDetails) {
        if (groupDetails) {
            return $.grep(groupDetails, function (groupDetail) {
                return groupDetail && (groupDetail.refLabel === refLabel);
            })[0];
        }
        return null;
    }

    function getCurrentGroupDetail(currentValues, groupDetails, n) {
        var n1, groupDetail = getGroupDetailByRefLabel(currentValues[0], groupDetails);
        for (n1 = 1; n1 <= n; n1++) {
            groupDetail = groupDetail && getGroupDetailByRefLabel(currentValues[n1], groupDetail.groupDetails);
        }
        return groupDetail;
    }

    function getGroupDetailText(currentValues, groupDetails, n, columns) {
        var groupDetail = getCurrentGroupDetail(currentValues, groupDetails, n);
        var groupDetailText = [];
        if (groupDetail) {
            $.each(groupDetail, function (key, value) {
                var column = getColumnById(key, columns);
                if (column) {
                    groupDetailText[groupDetailText.length] = column.label + ": " + getCellContent(value, column);
                }
            });
            return "[" + groupDetailText.join(", ") + "]";
        }
        return "";
    }

    function renderGroupDetail(parameters) {
        var n = parameters.n,
            columns = parameters.columns,
            $groupContainers = parameters.$groupContainers,
            groupDetails = parameters.groupDetails,
            currentGroupValues = parameters.currentGroupValues,
            cellContent,
            $row = $(),
            groupDetailInFirstColumnOnly = parameters.groupDetailsInFirstColumnOnly,
            groupDetail;
        if (groupDetails && groupDetails.length) {
            groupDetail = getCurrentGroupDetail(currentGroupValues, groupDetails, n);
        }
        var n1;
        for (n1 = n; n1 < columns.length; n1++) {
            cellContent = "";
            var column = columns[n1];
            if (n1 === n) {
                if (groupDetailInFirstColumnOnly) {
                    var groupDetailText = "";
                    if (groupDetails && groupDetails.length) {
                        if (groupDetail.label) {
                            cellContent = groupDetail.label;
                        } else {
                            groupDetailText = getGroupDetailText(currentGroupValues, groupDetails, n, columns);
                            cellContent = getCellContent(currentGroupValues[n], columns[n]) + " " + groupDetailText;
                        }
                    } else {
                        cellContent = getCellContent(currentGroupValues[n], columns[n]);
                    }
                } else {
                    cellContent = (groupDetail && groupDetail.label) || getCellContent(currentGroupValues[n], column);
                }
            } else if (!groupDetailInFirstColumnOnly && groupDetail && groupDetail[column.id]) {
                cellContent = groupDetail && getCellContent(groupDetail[column.id], column);
            }
            var $cell = getCell(column, cellContent, "");
            if (n1 === n) {
                $cell.addClass("first-cell-in-group");
            }
            $row = $row.add($cell);
        }
        $groupContainers[n].find(".group-header").append($row).addClass(groupDetailInFirstColumnOnly ? "details-in-first-column" : "");
    }

    function renderAndGetContainerForFirstLoad($groupContainers, n, columns, $placeHolder) {
        $groupContainers[n] = $(GROUP_HEADING_TEMPLATE.supplant({ level: n }));
        var $wrapper = $(GROUP_CONTAINER_WRAPPER_TEMPLATE);
        if (n !== 0) {
            $wrapper.append(getCell(columns[n - 1], "", "spacer"));
        }
        $wrapper.append($groupContainers[n]);
        $placeHolder.append($wrapper);
        $placeHolder = $groupContainers[n];
        return {$wrapper: $wrapper, $placeHolder: $placeHolder};
    }

    function renderAndGetContainerForFetchedRows($groupContainers, n, columns, $placeHolder) {
        $groupContainers[n] = $(GROUP_HEADING_TEMPLATE.supplant({ level: n }));
        var $wrapper = $(GROUP_CONTAINER_WRAPPER_TEMPLATE);
        if (n === 0) {
            $wrapper.append($groupContainers[n]);
            $placeHolder.append($wrapper);
        } else {
            $wrapper.append(getCell(columns[n - 1], "", "spacer"));
            $wrapper.append($groupContainers[n]);
            $groupContainers[n - 1].append($wrapper);
        }
        return {$wrapper: $wrapper, $placeHolder: $placeHolder};
    }

    function renderGroupHeading(parameters) {
        var $placeHolder = parameters.$placeHolder,
            groups = parameters.groups,
            level = parameters.level,
            currentGroupValues = parameters.currentGroupValues,
            columns = parameters.columns,
            groupDetails = parameters.groupDetails,
            n,
            l,
            $wrapper,
            $groupContainers,
            start,
            methodToCall;
        if (parameters.$groupContainers === null) {
            $groupContainers = [];
            start = 0;
            methodToCall = renderAndGetContainerForFirstLoad;
        } else {
            $groupContainers = parameters.$groupContainers;
            start = level;
            methodToCall = renderAndGetContainerForFetchedRows;
        }
        for (n = start, l = groups.length; n < l; n += 1) {
            var containers = methodToCall($groupContainers, n, columns, $placeHolder);
            $wrapper = containers.$wrapper;
            $placeHolder = containers.$placeHolder;
            renderGroupDetail({
                n: n,
                columns: columns,
                $groupContainers: $groupContainers,
                groupDetails: groupDetails,
                currentGroupValues: currentGroupValues,
                groupDetailsInFirstColumnOnly: parameters.groupDetailsInFirstColumnOnly
            });
        }
        return $groupContainers;
    }

    function addRows(parameters) {
        var tableId = parameters.tableId;
        var rows = parameters.rows;
        var columns = parameters.columns;
        var groups = parameters.groups;
        var $rowMainContainer = parameters.$rowMainContainer;
        var $groupContainers = parameters.$groupContainers;
        var areFetchedRows = parameters.areFetchedRows;
        var currentGroupValues = parameters.currentGroupValues;
        var isStartEven = parameters.isStartEven;
        var cachedGridData = parameters.cachedGridData;
        var rowWidth = parameters.rowWidth;
        var groupDetails = parameters.groupDetails;
        var groupsLength = groups && groups.length;
        var idPostFix = new Date().getTime() + Math.floor(Math.random() * 100);
        $.each(rows, function (i, row) {
            row.id = row.id || tableId + "Row" + (idPostFix + i);
            var rowId = row.id,
                rowData = rowId ? row.data : row,
                $rowContainer = $rowMainContainer,
                $row;
            if (rowId) {
                (cachedGridData[rowId] = row);
            }
            if (groupsLength) {
                if ($groupContainers === null) {
                    $.each(groups, function (index) {
                        currentGroupValues[index] = rowData[index];
                    });
                    $groupContainers = renderGroupHeading({
                        $placeHolder: $rowMainContainer,
                        groups: groups,
                        level: null,
                        currentGroupValues: currentGroupValues,
                        $groupContainers: $groupContainers,
                        columns: columns,
                        groupDetails: groupDetails,
                        groupDetailsInFirstColumnOnly: parameters.groupDetailsInFirstColumnOnly
                    });
                } else {
                    $.each(groups, function (index) {
                        var x;
                        if (rowData[index] !== currentGroupValues[index]) {
                            for (x = index; x < groupsLength; x += 1) {
                                currentGroupValues[x] = rowData[x];
                            }
                            $groupContainers = renderGroupHeading({
                                $placeHolder: $rowMainContainer,
                                groups: groups,
                                level: index,
                                currentGroupValues: currentGroupValues,
                                $groupContainers: $groupContainers,
                                columns: columns,
                                groupDetails: groupDetails,
                                groupDetailsInFirstColumnOnly: parameters.groupDetailsInFirstColumnOnly
                            });
                        }
                    });
                }
                $rowContainer = $groupContainers[groupsLength - 1];
            }
            $row = getNewRow(tableId, row, groupsLength, columns);
            if ((i + (isStartEven ? 1 : 0)) % 2 === 0) {
                $row.addClass("even");
            }
            if (i === 0 && !areFetchedRows) {
                $row.addClass("row-first");
            }
            if (rowWidth) {
                $row.css("width", rowWidth);
            }
            $rowContainer.append($row);
        });

        return {
            $groupContainers: $groupContainers,
            currentGroupValues: currentGroupValues
        };
    }

    function getCellContent(cellContent, column, columnIndex, row) {
        var cellRenderer = (column.type || column.renderer);
        if (cellRenderer) {
            cellContent = $.mettleDataGrid.renderer[cellRenderer].cell(cellContent, column, columnIndex, row);
        }
        return cellContent;
    }

    function getNewRow(tableId, row, groupLength, columns) {
        var rowId = row.id;
        var rowData = rowId ? row.data : row,
            $row = $(ROW_TEMPLATE.supplant({
                level: groupLength,
                id: tableId + DATA_ROW_KEY + rowId
            })),
            previousColumn = columns[groupLength - 1];
        var n, l;
        if (previousColumn) {
            $row.append(getCell(previousColumn, ""));
        }
        for (n = groupLength, l = rowData.length; n < l; n += 1) {
            $row.append(getCell(columns[n], getCellContent(rowData[n], columns[n], n, row), null, n === (l - 1)));
        }
        return $row;
    }

    function getCell(column, value, spacerClass, isLastCell) {
        var $cell = $(CELL_TEMPLATE.supplant({
            value: value || "&nbsp;",
            columnId: column.id,
            cssClass: (column.type || column.renderer || "") + (isLastCell ? " last" : ""),
            spacerClass: spacerClass || ""
        }));
        $cell.css({
            "width": column.width,
            "display": column.isHidden ? "none" : ""
        });
        $cell.css("width", column.width);
        return $cell;
    }

}(jQuery));

if (!Array.indexOf) {
    Array.prototype.indexOf = function (obj, start) {
        "use strict";

        var i, l;
        for (i = (start || 0), l = this.length; i < l; i += 1) {
            if (this[i] === obj) {
                return i;
            }
        }
        return -1;
    };
}

if (!String.hasOwnProperty("supplant")) {
    String.prototype.supplant = function (jsonObject, keyPrefix) {
        "use strict";

        return this.replace(/\{([^{}]*)\}/g, function (matchedString, capturedString1) {
            var jsonPropertyKey = keyPrefix ? capturedString1.replace(keyPrefix + ".", "") : capturedString1,
                jsonPropertyValue = jsonObject[jsonPropertyKey];
            return jsonPropertyValue !== undefined ? jsonPropertyValue : matchedString;
        });
    };
}
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

    var DEFAULT_CLIENT_PAGE_SIZE = 100;

    MettleDataGrid.DataStore = function (source, clientCache) {

        var fullyLoaded,
            dataSet,
            dataStoreRows,
            dataStoreColumns,
            lastResponseData;

        function fetchRows(requestData, onSuccess) {
            callAction("fetchRows", requestData, onSuccess);
        }

        function filter(requestData, onSuccess) {
            callAction("filter", requestData, onSuccess);
        }

        function groupBy(requestData, onSuccess) {
            callAction("groupBy", requestData, onSuccess);
        }

        function sortBy(requestData, onSuccess) {
            callAction("sortBy", requestData, onSuccess);
        }

        function reorderColumn(requestData, onSuccess) {
            callAction("reorderColumn", requestData, onSuccess);
        }

        function load(requestData, onSuccess) {
            callAction("load", requestData, onSuccess);
        }

        function getCurrentMetaData() {
            if (dataSet) {
                return {
                    columns: (function () {
                        var cols = $.extend([], dataSet.columns);
                        $.each(cols, function (i, col) {
                            delete col.filterData;
                            delete col.filterType;
                        });
                        return cols;
                    }()),
                    filters: (function () {
                        var filters = $.extend([], dataSet.filters);
                        $.each(filters, function (i, filter) {
                            filter.type = filter.type || filter.filterType;
                            filter.value = filter.value || filter.filterData;
                            delete filter.filterData;
                            delete filter.filterType;
                        });
                        return filters;
                    }()),
                    state: $.extend({}, dataSet.state)
                };
            }
            return null;
        }

        function refresh(requestData, onSuccess) {
            fullyLoaded = false;
            load(requestData, onSuccess);
        }

        function destroy() {
            fullyLoaded = null;
            dataSet = null;
            dataStoreRows = null;
            dataStoreColumns = null;
            lastResponseData = null;
        }

        function callAction(actionType, requestData, callback) {
            requestData = requestData || {};
            if (!fullyLoaded) {
                source[actionType](transformDataForServer(requestData), function (responseData) {
                    sourceActionHandler(actionType, requestData, callback, responseData);
                });
            } else {
                clientActionsHandler(actionType, requestData, callback);
            }
        }

        function transformDataForServer(requestData) {
            var data = {};
            if (!$.isEmptyObject(requestData)) {
                data.state = $.extend({}, requestData);
            }
            if (requestData.pageSize) {
                data.pageSize = requestData.pageSize;
            }
            if (data.state && data.state.columnWidthOverride) {
                var columnWidthOverride = [];
                $.each(data.state.columnWidthOverride, function (key, value) {
                    columnWidthOverride.push({
                        id: key,
                        width: value
                    });
                });
                data.state.columnWidthOverride = columnWidthOverride;
            }
            if (data.state && data.state.pageSize) {
                delete data.state.pageSize;
            }
            return data;
        }

        function transformDataFromServer(responseData) {
            moveFilterDataInsideColumn(responseData.columns, responseData.filters);
            if (responseData.state) {
                if (responseData.state.columnWidthOverride) {
                    var columnWidthOverride = {};
                    $.each(responseData.state.columnWidthOverride, function (i, column) {
                        columnWidthOverride[column.id] = column.width;
                    });
                    responseData.state.columnWidthOverride = columnWidthOverride;
                }
                if (responseData.state.hiddenColumns) {
                    $.each(responseData.state.hiddenColumns, function (i, hiddenColumnId) {
                        getColumnInfoById(hiddenColumnId, responseData.columns).column.isHidden = true;
                    });
                }
                return $.extend(responseData, responseData.state);
            }
            return responseData;
        }

        function addNewColumnsInOrder(columnOrder, columns) {
            var columnsInNewOrder = [];
            var columnLast = [];
            $.each(columns, function (i, column) {
                if (columnOrder.indexOf(column.id) > -1) {
                    columnsInNewOrder[columnOrder.indexOf(column.id)] = column.id;
                } else {
                    columnLast.push(column.id);
                }
            });
            return columnsInNewOrder.concat(columnLast);
        }

        function clientActionsHandler(actionType, requestData, callback) {
            var transformedRows, reOrderedDataSet;
            transformedRows = getTransformedRowsIfJSON(dataSet.rows, dataSet.columns);
            dataStoreColumns = $.extend(true, [], dataSet.columns);
            dataStoreRows = getFilteredRows($.extend(true, [], transformedRows), requestData.filterBy, dataStoreColumns, dataSet.filters, false);
            var columnOrder;
            if (requestData.columnOrder && requestData.columnOrder.length) {
                columnOrder = requestData.columnOrder;
            } else if (dataSet.columnOrder && dataSet.columnOrder.length) {
                columnOrder = dataSet.columnOrder;
            } else {
                columnOrder = getColumnOrder(dataSet.columns);
            }
            columnOrder = addNewColumnsInOrder(columnOrder, dataSet.columns);
            reOrderedDataSet = reOrderDataSetAsPerColumnOrder(columnOrder, dataStoreColumns, dataStoreRows);
            dataStoreColumns = reOrderedDataSet.columns;
            dataStoreRows = reOrderedDataSet.rows;
            var stateData = $.extend({}, dataSet.state, requestData);
            sortDataSet(stateData, dataStoreColumns, dataStoreRows);
            var responseData = $.extend({}, requestData);
            if (actionType === "fetchRows") {
                responseData = {
                    rows: getRows(requestData.pageOffset - 1, requestData.pageSize, dataStoreRows)
                };
            } else {
                responseData = $.extend({}, getResponseData(DEFAULT_CLIENT_PAGE_SIZE, dataStoreColumns, dataStoreRows), responseData, {
                    filters: lastResponseData.filters,
                    isGridSortable: lastResponseData.isGridSortable,
                    isGridGroupable: lastResponseData.isGridGroupable,
                    isGridFilterable: lastResponseData.isGridFilterable,
                    isGridColumnReorderable: lastResponseData.isGridColumnReorderable
                });
            }
            setTimeout(function () {
                callback(responseData);
            }, 50);
        }

        function sourceActionHandler(actionType, requestData, callback, responseData) {
            responseData = transformDataFromServer(responseData);
            var transformedRows, reOrderedDataSet;
            lastResponseData = responseData;
            if (actionType === "fetchRows") {
                transformedRows = getTransformedRowsIfJSON(responseData.rows, dataSet.columns);
                var rowsWithReorderedData = reorderRowsDataBasedOnIndex(getColumnOrderInIndex(requestData.columnOrder, dataStoreColumns), transformedRows);
                dataSet.rows = dataStoreRows.concat(rowsWithReorderedData);
                dataStoreRows = dataSet.rows;
                if (clientCache && (dataSet.totalRows === dataSet.rows.length && isAllFilterInActive(dataSet.filterBy))) {
                    fullyLoaded = true;
                }
                callback({rows: rowsWithReorderedData});
            } else {
                dataSet = responseData;
                dataStoreColumns = $.extend(true, [], dataSet.columns);
                transformedRows = getTransformedRowsIfJSON(dataSet.rows, dataStoreColumns);
                var columnOrder;
                if (dataSet.columnOrder && dataSet.columnOrder.length) {
                    columnOrder = dataSet.columnOrder;
                } else {
                    columnOrder = getColumnOrder(dataStoreColumns);
                }
                columnOrder = addNewColumnsInOrder(columnOrder, dataSet.columns);
                reOrderedDataSet = reOrderDataSetAsPerColumnOrder(columnOrder, dataStoreColumns, transformedRows);
                dataStoreColumns = reOrderedDataSet.columns;
                dataStoreRows = reOrderedDataSet.rows;
                dataSet.rows = reOrderedDataSet.rows;
                dataSet.columns = reOrderedDataSet.columns;
                if (clientCache && (dataSet.totalRows <= dataSet.pageSize && isAllFilterInActive(dataSet.filterBy))) {
                    fullyLoaded = true;
                    callAction("load", requestData, callback);
                    return;
                }
                callback(dataSet);
            }
        }

        return {
            refresh: refresh,
            load: load,
            fetchRows: fetchRows,
            filter: filter,
            groupBy: groupBy,
            sortBy: sortBy,
            reorderColumn: reorderColumn,
            destroy: destroy,
            getCurrentMetaData: getCurrentMetaData
        };
    };

    function isAllFilterInActive(filter) {
        return filter === null || filter === undefined || filter.length === 0;
    }

    function moveFilterDataInsideColumn(columns, filters) {
        if (columns && filters) {
            $.each(columns, function (i, column) {
                var filterInfo = getFilterInfo(column, filters);
                column.filterType = filterInfo.type;
                column.filterData = filterInfo.value;
            });
        }
    }

    function getFilterInfo(column, filters) {
        var filterInfo = {};
        $.each(filters, function (i, filter) {
            if (filter.id === column.id) {
                filterInfo = {
                    type: filter.type || filter.filterType,
                    value: filter.value || filter.filterData
                };
                return false;
            }
            return true;
        });
        return filterInfo;
    }

    function isDataInJSONFormat(rows) {
        //noinspection OverlyComplexBooleanExpressionJS
        return rows && rows[0] && (!rows[0].data && !$.isArray(rows[0]));
    }

    function getTransformedRowsIfJSON(rows, columns) {
        if (isDataInJSONFormat(rows)) {
            return rowTransformer(rows, getColumnOrder(columns));
        }
        return rows;
    }

    function rowTransformer(rows, columnOrder) {
        var transformedRows = [];
        var n, l;
        for (n = 0, l = rows.length; n < l; n++) {
            transformedRows[transformedRows.length] = {
                id: rows[n].id || null,
                orig: rows[n],
                data: flattenRowData(rows[n], columnOrder)
            };
        }
        return transformedRows;
    }

    function flattenRowData(row, columnOrder) {
        var rowData = [];
        $.each(columnOrder, function (i, column) {
            rowData[rowData.length] = row[column];
        });
        return rowData;
    }

    function getColumnOrder(columns) {
        var columnsOrder = [];
        $.each(columns, function (i, column) {
            columnsOrder[columnsOrder.length] = column.id;
        });
        return columnsOrder;
    }

    function sortData(data, dataStoreColumns, dataStoreRows, serverSort) {
        if (serverSort) {
            var reorderedData = reOrderDataSetAsPerColumnOrder(getColumnOrder(dataStoreColumns), dataStoreColumns, dataStoreRows);
            dataStoreColumns = reorderedData.columns;
            dataStoreRows = reorderedData.rows;
        }
        var groupByColumns = data.groupBy && data.groupBy.length ? $.map(data.groupBy, function (column) {
            return column.id;
        }) : [];
        var sortByColumns = data.sortBy && data.sortBy.length ? data.sortBy[0].id : null;
        var sortByDirection = data.sortBy && data.sortBy.length ? data.sortBy[0].direction : null;
        var sortByColumnIDsInOrder = $.merge([], groupByColumns || []),
            sortOrder = [],
            sortDirection = [];
        var n, l;

        if (serverSort) {
            if (sortByColumns) {
                if (sortByColumnIDsInOrder.indexOf(sortByColumns) < 0) {
                    sortByColumnIDsInOrder.push(sortByColumns);
                }
            }
            sortOrder = $.map(sortByColumnIDsInOrder, function (columnID) {
                return getColumnInfoById(columnID, dataStoreColumns).index;
            });
            sortDirection = $.map(sortByColumnIDsInOrder, function (columnID) {
                return (columnID === sortByColumns) ? (sortByDirection === "desc" ? -1 : 1) : 1;
            });
        } else {
            for (n = 0, l = sortByColumnIDsInOrder.length; n < l; n++) {
                sortOrder.push(n);
                sortDirection.push(sortByColumnIDsInOrder[n] === sortByColumns ? (sortByDirection === "desc" ? -1 : 1) : 1);
            }
            if (sortByColumns) {
                if (sortByColumnIDsInOrder.indexOf(sortByColumns) < 0) {
                    sortOrder[sortOrder.length] = getColumnInfoById(sortByColumns, dataStoreColumns).index;
                    sortDirection[sortDirection.length] = (sortByDirection === "desc" ? -1 : 1);
                }
            }
        }

        multiColumnSorting(dataStoreRows, sortOrder, sortDirection, dataStoreColumns);
    }

    function getColumnSortComparator(columnIndex, dataStoreColumns) {
        var column = dataStoreColumns[columnIndex],
            cellRenderer = column.type || column.renderer;
        if (cellRenderer) {
            cellRenderer = $.mettleDataGrid.renderer[cellRenderer];
        }
        if (cellRenderer && cellRenderer.comparator) {
            return cellRenderer.comparator;
        }
        return defaultSortComparator;
    }

    function defaultSortComparator(valA, valB) {
        return valA === valB ? 0 : (valA < valB ? -1 : 1);
    }

    function multiColumnSorting(TheArr, columnIndexInOrder, direction, dataStoreColumns) {
        if (!(columnIndexInOrder && columnIndexInOrder.length > 0)) {
            return;
        }
        var columnComparator = [];
        $.each(columnIndexInOrder, function (i, columnIndex) {
            columnComparator[columnIndex] = getColumnSortComparator(columnIndex, dataStoreColumns);
        });
        var columnIndexInOrderLength = columnIndexInOrder.length;
        TheArr.sort(sortMulti);
        function sortMulti(objA, objB, n1) {
            var n = (arguments.length === 2) ? 0 : n1;
            var a = objA.data,
                b = objB.data,
                columnIndex = columnIndexInOrder[n],
                swap = swapValues(columnIndex, a, b, columnComparator[columnIndex]);
            if (columnIndexInOrderLength === 1 || columnIndex === undefined || swap !== 0) {
                return swap * direction[n];
            }
            if (n < columnIndexInOrderLength - 1) {
                return sortMulti(objA, objB, ++n);
            }
            return 0;
        }
    }

    function swapValues(colIndex, a, b, sortComparator) {
        var valA = a[colIndex];
        var valB = b[colIndex];
        return sortComparator(valA, valB);
    }

    function getRows(start, length, dataStoreRows) {
        var rows = [],
            i = 0,
            n;
        for (n = start; n < start + length; n++) {
            if (!dataStoreRows[n]) {
                break;
            }
            rows[i++] = dataStoreRows[n];
        }
        return rows;
    }

    function getResponseData(pageSize, dataStoreColumns, dataStoreRows) {
        return {
            columns: dataStoreColumns,
            rows: getRows(0, pageSize, dataStoreRows),
            totalRows: dataStoreRows.length,
            pageSize: pageSize
        };
    }

    function getColumnInfoById(columnId, columns) {
        var foundIndex = -1,
            column = $.grep(columns, function (column, index) {
                if (column.id === columnId) {
                    foundIndex = index;
                    return true;
                }
                return false;
            })[0];
        return {
            column: column,
            index: foundIndex
        };
    }

    function getFilteredRows(dataRows, filterBy, dsColumns, filters, serverFilter) {
        var filterColumns, filterValues = [];
        if (filterBy) {
            filterColumns = $.map(filterBy, function (filter) {
                return filter.id;
            });
            $.each(filterBy, function (i, filter) {
                filterValues.push(filter);
            });
        }
        if (serverFilter) {
            moveFilterDataInsideColumn(dsColumns, filters);
            dataRows = getTransformedRowsIfJSON(dataRows, dsColumns);
        }
        var rows = [],
            filterColumnsIndex;
        var columns = [];
        if (filterColumns) {
            filterColumnsIndex = $.map(filterColumns, function (columnId) {
                var columnInfo = getColumnInfoById(columnId, dsColumns);
                var column = columnInfo.column;
                columns[columnInfo.index] = {
                    column: column,
                    filterFunc: ($.mettleDataGrid.filter[column.filterType] && $.mettleDataGrid.filter[column.filterType].filter) || defaultFilter
                };
                return (columnInfo.index);
            });
            $.each(dataRows, function (i, row) {
                var addRow = true;
                $.each(filterColumnsIndex, function (i, index) {
                    if (!columns[index].filterFunc(filterValues[i], row.data[index])) {
                        addRow = false;
                    }
                });
                if (addRow) {
                    rows.push(row);
                }
            });
        } else {
            rows = dataRows;
        }
        return rows;
    }

    function defaultFilter(filter, columnValue) {
        var addRow = true;
        var filterValue = filter.value;
        if ($.isArray(filterValue)) {
            if (filterValue.indexOf(columnValue) < 0) {
                addRow = false;
            }
        } else {
            if ((String(columnValue)).toLowerCase().indexOf((String(filterValue)).toLowerCase()) < 0) {
                addRow = false;
            }
        }
        return addRow;
    }

    function reorderRowsDataBasedOnIndex(newOrder, rows) {
        $.each(rows, function (i, row) {
            var newDataRow = [];
            var n, l;
            for (n = 0, l = row.data.length; n < l; n++) {
                newDataRow[n] = row.data[newOrder[n]];
            }
            row.data = newDataRow;
        });
        return rows;
    }

    function getColumnOrderInIndex(columnOrder, columns) {
        return $.map(columnOrder, function (columnId) {
            return (getColumnInfoById(columnId, columns).index);
        });
    }

    function getReOrderedColumn(columnOrder, columns) {
        return $.map(columnOrder, function (columnId) {
            return (getColumnInfoById(columnId, columns).column);
        });
    }

    function reorderData(columnOrder, columns, rows) {
        reorderRowsDataBasedOnIndex(getColumnOrderInIndex(columnOrder, columns), rows);
        columns = getReOrderedColumn(columnOrder, columns);
        return {
            columns: columns,
            rows: rows,
            columnOrder: columnOrder
        };
    }

    function reOrderDataSetAsPerColumnOrder(columnOrder, dataStoreColumns, dataStoreRows) {
        return reorderData(columnOrder, dataStoreColumns, dataStoreRows);
    }

    function hasGroupByOrSortBy(data) {
        //noinspection OverlyComplexBooleanExpressionJS
        return (data.groupBy && data.groupBy.length) || (data.sortBy && data.sortBy.length);
    }

    function sortDataSet(data, dataStoreColumns, dataStoreRows) {
        if (hasGroupByOrSortBy(data)) {
            sortData(data, dataStoreColumns, dataStoreRows);
        }
    }

    MettleDataGrid.DataStore.utils = {
        getFilteredRows: getFilteredRows,
        sortData: sortData,
        getRows: getRows
    };

}(jQuery));
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

    var groupContainers = {};

    $.mettleDataGrid = $.extend(true, $.mettleDataGrid, {
        plugin: {
            groups: function ($mettleDataGrid, options) {
                options = $.extend({
                    id: options.id,
                    isGridGroupable: true,
                    onGroupChange: $.noop,
                    onGroupReorder: $.noop,
                    groupsPlaceHolder: null,
                    groupBy: null
                }, options);

                var $groupsMainContainer,
                    currentGroupColumnIds;

                function renderGroups(columns, groupedColumnIds) {
                    var groupedColumnIdsLength = groupedColumnIds.length,
                        $groupContainer,
                        $groups;
                    if (groupedColumnIdsLength) {
                        $groupsMainContainer.find(".empty-message").hide();
                        $groupContainer = $groupsMainContainer.find(".groups").show();
                        $groupContainer.empty();
                        $groups = $();
                        $.each(groupedColumnIds, function (i, columnId) {
                            var $group = $("<span id='{id}' class='cell'><span class='arrow'><span class='label'><a class='remove' href='#'>x</a> {label}</span></span></span>".supplant({
                                label: columns[options.columnsHashMap[columnId]].label,
                                id: options.id + "GroupBy_" + columnId
                            }));
                            $groups = $groups.add($group);
                            if (i === 0) {
                                $group.addClass("first");
                            }
                            if (i === groupedColumnIdsLength - 1) {
                                $group.addClass("last");
                            }
                        });
                        $groupContainer.append($groups);
                    } else {
                        $groupsMainContainer.find(".empty-message").show();
                        $groupsMainContainer.find(".groups").hide();
                    }
                    currentGroupColumnIds = groupedColumnIds;
                }

                function removeColumnFromGroup(columnId) {
                    var newGroupColumnIds = $.grep(currentGroupColumnIds, function (id) {
                        return id !== columnId;
                    });
                    $mettleDataGrid.removeClass("mettleDataGrid-initialized");
                    options.onGroupChange(newGroupColumnIds);
                }

                //noinspection JSUnusedLocalSymbols
                function onColumnGroupingDrop(event, ui) {
                    var columnId = $.mettleDataGrid.getElementId(ui.draggable.attr("id"));
                    if (currentGroupColumnIds && currentGroupColumnIds.indexOf(columnId) > -1) {
                        return false;
                    }
                    currentGroupColumnIds.push(columnId);
                    setTimeout(function () {
                        $mettleDataGrid.removeClass("mettleDataGrid-initialized");
                        options.onGroupChange(currentGroupColumnIds);
                    }, 10);
                    return true;
                }

                function onGroupExpandCollapse(event) {
                    var $ele = $(event.currentTarget),
                        isGroupOpen = !$ele.data("state");
                    $ele.data("state", isGroupOpen);
                    $ele.find(".open-close-indicator").html(isGroupOpen ? "+" : "-");
                    $ele.removeClass("open close").addClass(isGroupOpen ? "close" : "open");
                    var $group = $ele.parents(".group").eq(0);

                    if (isGroupOpen) {
                        $group.addClass("group-closed");
                        setTimeout(function () {
                            $group.addClass("group-closed-complete");
                        }, 300);
                    } else {
                        $group.removeClass("group-closed-complete");
                        setTimeout(function () {
                            $group.removeClass("group-closed");
                        }, 10);
                    }

                    setTimeout(function () {
                        //BEGIN: Fix for IE8 incremental load when group is collapsed and more data is needed
                        $mettleDataGrid.find(".group-data").css({
                            zoom: 1
                        }).css({
                            zoom: 0
                        });
                        //END

                        if ($mettleDataGrid.find(".mettleDataGrid-rows")[0].scrollHeight <= $mettleDataGrid.find(".mettleDataGrid-rows").height()) {
                            options.onScrollToBottom();
                        }
                    }, 450);
                }

                function onGroupReorderDrop(event, ui) {
                    var $ele = $(event.target);
                    $ele.removeClass("reorder");
                    var groupIdToMove = $.mettleDataGrid.getElementId(ui.draggable.attr("id")),
                        groupIdToMoveAfter = $.mettleDataGrid.getElementId($ele.attr("id")),
                        newGroupOrder = [];
                    $.each(options.groupBy, function (i, columnId) {
                        if (columnId !== groupIdToMove) {
                            newGroupOrder.push(columnId);
                        }
                        if (columnId === groupIdToMoveAfter) {
                            newGroupOrder.push(groupIdToMove);
                        }
                    });
                    $mettleDataGrid.removeClass("mettleDataGrid-initialized");
                    options.onGroupReorder(newGroupOrder);
                }

                function load(helper) {
                    if (!options.isGridGroupable) {
                        return;
                    }

                    $.each(options.columns, function (index, column) {
                        if (!($.mettleDataGrid.renderer[column.type] && $.mettleDataGrid.renderer[column.type].headerCell)) {
                            if (column.isGroupable !== false) {
                                helper.getColumnElementById(column.id, options)
                                    .append("<span class='groupable-indicator'></span>")
                                    .addClass("groupable-column");
                            }
                        }
                    });

                    $mettleDataGrid.undelegate(".group .group-header", "click").delegate(".group .group-header", "click", onGroupExpandCollapse);
                    $groupsMainContainer = $(options.groupsPlaceHolder).undelegate("a.remove", "click.groups").delegate("a.remove", "click.groups", function () {
                        removeColumnFromGroup($.mettleDataGrid.getElementId($(this).parents(".cell").eq(0).attr("id")));
                        return false;
                    });
                    groupContainers[options.id] = $groupsMainContainer;
                    renderGroups(options.columns, options.groupBy);

                    if ($.fn.droppable) {
                        $groupsMainContainer.droppable({
                            drop: onColumnGroupingDrop,
                            accept: "#" + options.id + " .groupable-column",
                            activeClass: "ui-state-highlight",
                            tolerance: "touch",
                            hoverClass: "ui-state-highlight-hover"
                        });
                        $groupsMainContainer.find(".cell").droppable({
                            accept: ".groups .cell",
                            drop: onGroupReorderDrop,
                            over: onGroupReorderOver,
                            out: onGroupReorderOut,
                            tolerance: "pointer"
                        });
                    }

                    if ($.fn.draggable) {
                        $groupsMainContainer.find(".cell").draggable({
                            drop: onColumnGroupingDrop,
                            helper: getGroupHelper,
                            accept: "#" + options.id + " .groupable-column",
                            containment: $groupsMainContainer
                        });
                    }

                    options.makeColumnDraggable($mettleDataGrid);
                }

                function destroy() {
                    if ($groupsMainContainer) {
                        if ($.fn.droppable) {
                            $groupsMainContainer.droppable("destroy");
                            $groupsMainContainer.find(".cell").droppable("destroy");
                        }
                        if ($.fn.draggable) {
                            $groupsMainContainer.find(".cell").draggable("destroy");
                        }
                        delete groupContainers[options.id];
                        $groupsMainContainer.undelegate("a.remove", "click.groups");
                        $groupsMainContainer.find(".groups").empty();
                        $groupsMainContainer = null;
                    }
                    currentGroupColumnIds = null;
                    options = null;
                }

                return {
                    load: load,
                    destroy: destroy
                };
            }
        }
    });

    function onGroupReorderOver(event) {
        $(event.target).addClass("reorder");
    }

    function onGroupReorderOut(event) {
        $(event.target).removeClass("reorder");
    }

    function getGroupHelper(event) {
        return $(event.currentTarget).clone(false).addClass("group-helper");
    }
}(jQuery));
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

    $.mettleDataGrid.updateRow = "mettleDataGrid-update-row";

    $.mettleDataGrid = $.extend(true, $.mettleDataGrid, {
        plugin: {
            realTimeData: function ($mettleDataGrid, options, cachedGridData) {

                options = $.extend({
                    isLive: true
                }, options);

                function load(helper) {
                    if (!options.isLive) {
                        return;
                    }

                    //noinspection JSUnusedLocalSymbols
                    function onRowUpdate(event, row) {
                        $.each(row, function (key, value) {
                            var column = helper.getColumnById(key, options.columns);
                            if (column) {
                                var $cell = helper.getRowElementById(row.id, options).find("." + key);
                                if (column.type === "NUMERIC") {
                                    var oldValue = cachedGridData[row.id].orig[key];
                                    if (value > oldValue) {
                                        $cell.removeClass("negative").addClass("updated-cell positive");
                                    } else if (value < oldValue) {
                                        $cell.removeClass("positive").addClass("updated-cell negative");
                                    }
                                    cachedGridData[row.id].orig[key] = value;
                                }
                                $cell.html(helper.getCellContent(value, column));
                                window.setTimeout(function () {
                                    $cell.removeClass("updated-cell");
                                    $cell = null;
                                }, 2000);
                            }
                        });
                    }

                    $mettleDataGrid.unbind($.mettleDataGrid.updateRow).bind($.mettleDataGrid.updateRow, onRowUpdate);

                }

                function destroy() {
                    $mettleDataGrid.unbind($.mettleDataGrid.updateRow);
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

    var toolbarContainer = {};

    $.mettleDataGrid = $.extend(true, $.mettleDataGrid, {
        plugin: {
            toolbar: function ($mettleDataGrid, options) {

                options = $.extend({
                    showToolbar: true,
                    toolbarTemplate: "<div class='mettleDataGrid-toolbar'><a href='#' class='mettleDataGrid-reset'>Reset</a><a href='#' class='mettleDataGrid-refresh'>Refresh</a></div>",
                    onReset: $.noop
                }, options);

                var $toolbar;

                function load() {
                    if (!options.showToolbar) {
                        return;
                    }
                    $toolbar = $(options.toolbarTemplate);
                    toolbarContainer[options.id] = $toolbar;
                    $mettleDataGrid.prepend($toolbar);
                    $mettleDataGrid.undelegate(".mettleDataGrid-reset", "click").delegate(".mettleDataGrid-reset", "click", function () {
                        options.onReset();
                        return false;
                    });
                    $mettleDataGrid.undelegate(".mettleDataGrid-refresh", "click").delegate(".mettleDataGrid-refresh", "click", function () {
                        options.onRefresh();
                        return false;
                    });
                }

                function destroy() {
                    delete toolbarContainer[options.id];
                    if ($toolbar) {
                        $mettleDataGrid.undelegate(".mettleDataGrid-reset", "click");
                        $mettleDataGrid.undelegate(".mettleDataGrid-refresh", "click");
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

}(jQuery));
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

    $.statePersistToCookie = $.cookie && {
        load: function (key, callback) {
            callback($.cookie(key));
        },
        save: function (key, value, callback) {
            $.cookie(key, value, {
                expires: 100,
                path: '/'
            });
            if (callback) {
                callback();
            }
        }
    };
}(jQuery));
(function ($) {
    "use strict";

    var filtersLastVal = {};
    var typeSearchDelay = 600;

    $.mettleDataGrid.filter.FREE_TEXT = {
        render: function (id) {
            var text = "<input id='{id}' type='text' class='{filterIdentifier}'/>";
            return text.supplant({
                id: id
            });
        },
        init: function ($filter, onFilter, gridId) {
            var typeSearchDelayTimer = null;
            $filter.bind("change.filter", onFilter).bind("keyup.filter", function (event) {
                var $ele = $(event.target);
                if (filtersLastVal[gridId] && filtersLastVal[gridId][$ele.attr("id")] !== $ele.val() && filtersLastVal[gridId][$ele.attr("id")] !== undefined) {
                    window.clearTimeout(typeSearchDelayTimer);
                    typeSearchDelayTimer = window.setTimeout(function () {
                        onFilter.call($ele[0]);
                        typeSearchDelayTimer = null;
                    }, typeSearchDelay);
                }
                filtersLastVal[gridId] = filtersLastVal[gridId] || {};
                filtersLastVal[gridId][$ele.attr("id")] = $ele.val();
            });
        },
        filterBy: function ($filter, filter) {
            $filter.val(filter.value);
        },
        getValue: function ($filter) {
            var value = $filter.val();
            return value && {
                value: value
            };
        },
        destroy: function ($filter) {
            $filter.unbind("change.filter").unbind("keyup.filter");
        }
    };

}(jQuery));
(function ($) {
    "use strict";

    $.mettleDataGrid = $.extend(true, $.mettleDataGrid, {
        plugin: {
            LABEL_BUTTON: function ($mettleDataGrid, options, cachedData) {

                options = $.extend({
                    labelButtonIdentifier: ".button"
                }, options);

                function load() {
                    $mettleDataGrid.delegate(options.labelButtonIdentifier, "click", function () {
                        var rowId = $.mettleDataGrid.getElementId($(this).closest(".row").attr("id"));
                        alert("Cell data: " + $(this).next().val() + ", Row data: " + JSON.stringify(cachedData[rowId]));
                        return false;
                    });
                }

                function update(_cachedData) {
                    cachedData = _cachedData;
                }

                function destroy() {
                    $mettleDataGrid.undelegate(options.labelButtonIdentifier, "click");
                    options = null;
                }

                return {
                    load: load,
                    update: update,
                    destroy: destroy
                };
            }
        }
    });

}(jQuery));
(function ($) {
    "use strict";

    $.mettleDataGrid.renderer.DATE = {
        cell: function (data) {
            return "<span class='date'>{date}</span>".supplant({
                date: data || "&nbsp;"
            });
        },
        comparator: function (valA, valB) {
            return getDateTimeValue(valA) - getDateTimeValue(valB);
        }
    };

    function getDateTimeValue(dateString) {
        var datePartColumnValue = /(\d{1,2})\/(\d{2})\/(\d{4})/.exec(dateString);
        return datePartColumnValue ? new Date(datePartColumnValue[3], parseInt(datePartColumnValue[2], 10) - 1, datePartColumnValue[1]).getTime() : dateString;
    }

}(jQuery));
(function ($) {
    "use strict";

    $.mettleDataGrid.renderer.NUMERIC = {
        cell: function (data) {
            return data ? data.toFixed(2) : "";
        },
        comparator: function (valA, valB) {
            valA = Number(String(valA).replace(/,/g, ""));
            valB = Number(String(valB).replace(/,/g, ""));
            return valA - valB;
        }
    };

}(jQuery));
(function ($) {
    "use strict";

    var monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    $.mettleDataGrid.renderer.SYSTEM_DATE = {
        cell: function (data) {
            var dateParts = data.split("-");
            var stringDate = data !== "-" ? [dateParts[2], "-", monthNames[(+dateParts[1]) - 1], "-", dateParts[0]].join("") : "-";
            return "<span class='date'>{date}</span>".supplant({
                date: stringDate
            });
        }
    };

}(jQuery));
(function ($) {
    "use strict";

    $.mettleDataGrid.renderer.TEXT = {
        cell: function (data) {
            return data;
        },
        comparator: function (valA, valB) {
            return valA < valB ? -1 : (valA > valB ? 1 : 0);
        }
    };

}(jQuery));
