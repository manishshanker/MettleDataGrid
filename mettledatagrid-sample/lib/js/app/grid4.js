(function ($, mettleDataGridFakeSource) {
    "use strict";
    var isStarted = false;
    var updateTimer;

    $(function () {
        var gridCB = new MettleDataGrid({
            dataSource: new mettleDataGridFakeSource.FakeLocalSource(mettleDataGridFakeSource.fakeDataSet6),
            id: "gridLive"
        });
        gridCB.load();

        if (location.hash.indexOf("child") < 0) {
            $(document).on("keydown", function (event) {
                if (event.keyCode === 83) {
                    isStarted = !isStarted;
                    if (isStarted) {
                        updateRowData();
                    } else {
                        window.clearTimeout(updateTimer);
                    }
                }
            });
        } else {
            updateRowData();
        }

        $.cookie("data", null);

    });


    //Real time time data emulator
    function updateRow(data) {
        if (data) {
            $("#gridLive").trigger(jQuery.mettleDataGrid.updateRow, [data]);
        }
    }

    function randomData(data, key) {
        if (Math.round(Math.random() * 2) > 1) {
            data[key] = (1 + (Math.random() * 30));
        }
    }

    function updateRowData() {
        var data = JSON.parse($.cookie("data"));
        if (location.hash.indexOf("child") < 0) {
            data = {};
            data.id = 1 + Math.floor(Math.random() * 50);
            randomData(data, "colBid");
            randomData(data, "colAsk");
            randomData(data, "colMin");
            data.colTime = new Date().toLocaleTimeString();
            if (Math.round(Math.random() * 2) > 1) {
                data.colMax = (30 + (Math.random() * 30));
            }
            $.cookie("data", JSON.stringify(data));
        }
        updateRow(data);
        updateTimer = window.setTimeout(updateRowData, 100);
    }

}(jQuery, window.mettleDataGridFakeSource));