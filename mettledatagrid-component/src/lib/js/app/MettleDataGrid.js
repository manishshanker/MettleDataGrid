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
 * @buildTimestamp __TIMESTAMP__
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