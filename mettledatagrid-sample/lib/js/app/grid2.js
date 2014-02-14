(function($, mettleDataGridFakeSource) {
    "use strict";

    $(function () {
        var gridCB = new MettleDataGrid({
            dataSource: new mettleDataGridFakeSource.FakeLocalSource(mettleDataGridFakeSource.fakeDataSet1),
            id: "gridCB"
        });
        gridCB.load();
    });

}(jQuery, window.mettleDataGridFakeSource));