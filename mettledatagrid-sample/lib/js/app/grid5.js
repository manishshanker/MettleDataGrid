(function ($, FB, mettleDataGridFakeSource) {
    "use strict";

    function renderGridAndConnectToWebSocket() {

        var isStarted = false;
        var updateTimer;
        var webSocketService;
        var userId = Math.random() * 100000;

        $(function () {
            webSocketService = new FB.WebSocketService({
                onTick: updateRow,
                onLoaded: onLoaded
            });

            webSocketService.connect();

            var fakeDataSet = mettleDataGridFakeSource.fakeDataSet5;

            function transformSourceData(data) {
                var transformedData = [];
                $.each(data.rowData, function (key, value) {
                    transformedData.push(value);
                });
                data.metaData.rows = transformedData;
                return data.metaData;
            }

            function transformToSourceData(data) {
                var transformedData = {};
                $.each(data.rows, function (i, item) {
                    transformedData["s" + item.id] = item;
                });
                return {
                    metaData: data,
                    rowData: transformedData
                };
            }

            function onLoaded(value) {
                if (value.val() && value.val().gridData) {
                    fakeDataSet = transformSourceData(value.val().gridData);
                } else {
                    webSocketService.publish({gridData: transformToSourceData(fakeDataSet)});
                }
                var gridCB = new MettleDataGrid({
                    dataSource: new mettleDataGridFakeSource.FakeLocalSource(fakeDataSet),
                    showToolbar: false,
                    rowHover: false,
                    id: "gridLive"
                });
                gridCB.load();

                $("#startStopBtn").on("click", function (event) {
                    isStarted = !isStarted;
                    if (isStarted) {
                        $("#startStopBtn").attr("value", "Stop");
                        updateRowData();
                    } else {
                        $("#startStopBtn").attr("value", "Start");
                        window.clearTimeout(updateTimer);
                    }
                });
            }
        });

        function updateRow(data) {
            if (data.userId) {
                if (userId === data.userId) {
                    $("#startStopBtn").attr("value", "Stop");
                } else {
                    $("#startStopBtn").css("visibility", "hidden");
                }
                if (data) {
                    $("#gridLive").trigger(jQuery.mettleDataGrid.updateRow, [data]);
                    $("#flotcontainer").trigger("update", [data]);
                }
            }
        }

        function getTime(date) {
            return date.getHours() + ":" + date.getMinutes() + ":" + date.getSeconds();
        }

        function randomData(data, key, minVal, rangeVal) {
            if (Math.round(Math.random() * 2) > 1) {
                data[key] = ((minVal || 1) + (Math.random() * (rangeVal || 30)));
                data.colTime = getTime(new Date());
            }
        }

        function updateRowData() {
            var data = {};
            data.id = 1 + Math.floor(Math.random() * 9);
            randomData(data, "colBid", 30, 3);
            randomData(data, "colAsk", 33, 3);
            randomData(data, "colMin");

            if (Math.round(Math.random() * 2) > 1) {
                data.colMax = (30 + (Math.random() * 30));
                data.colTime = getTime(new Date());
            }
            if (data.colTime) {
                data.userId = userId;
                webSocketService.publish({tickData: data});
                webSocketService.publishChild("gridData.rowData.s" + data.id, data);
            }
            updateTimer = window.setTimeout(updateRowData, 100);
        }

    }

    //Dynamic chart plotting
    function renderChartAndListenToTickUpdates() {
        var chartData = [];
        var chartDataXAxisLabel = {};
        var totalPoints = 25;
        var lastBid = 12.89;
        var n = 0;

        function updateData(newTime, newData) {
            if (chartData.length > totalPoints) {
                chartData.shift();
            }
            chartDataXAxisLabel[n] = newTime;
            chartData.push([n++, newData]);
        }

        var options = {
            series: {
                shadowSize: 0 // Drawing is faster without shadows
            },
            yaxis: {
                min: -100,
                max: 100,
                font: {
                    size: 10,
                    lineHeight: 13,
                    family: "sans-serif",
                    variant: "small-caps",
                    color: "#545454"
                }
            },
            xaxis: {
                show: true,
                ticks: 5,
                tickFormatter: function (a, b, c) {
                    return chartDataXAxisLabel[a] || "";
                },
                font: {
                    size: 10,
                    lineHeight: 13,
                    family: "sans-serif",
                    variant: "small-caps",
                    color: "#545454"
                }
            }
        };

        (function init() {

            var plot = $.plot("#flotcontainer", [chartData], options);

            $("#flotcontainer").on("update", function (e, data) {
                if (data.colBid && data.id === 7) {
                    updateData(data.colTime, data.colBid - lastBid);
                    lastBid = data.colBid;
                } else {
                    updateData(data.colTime, 0);
                }
                plot.setData([chartData]);
                plot.setupGrid();
                plot.draw();
            });

        }());
    }

    $(function () {
        renderGridAndConnectToWebSocket();
        renderChartAndListenToTickUpdates();
    });

}(jQuery, FB, window.mettleDataGridFakeSource));