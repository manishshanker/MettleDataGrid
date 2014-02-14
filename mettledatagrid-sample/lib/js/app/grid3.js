(function($, mettleDataGridFakeSource) {
    "use strict";

    $(function () {
        var grid1 = new MettleDataGrid({
            dataSource: new mettleDataGridFakeSource.FakeLocalSource(mettleDataGridFakeSource.fakeDataSet4),
            id: "grid1"
        });
        grid1.load();
        var grid2 = new MettleDataGrid({
            dataSource: new mettleDataGridFakeSource.FakeLocalSource(mettleDataGridFakeSource.fakeDataSet2),
            id: "grid2"
        });
        grid2.load();
    });

}(jQuery, window.mettleDataGridFakeSource));