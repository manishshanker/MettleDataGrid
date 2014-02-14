(function($, mettleDataGridFakeSource) {
    "use strict";

    $(function () {
        var grid1 = new MettleDataGrid({
            dataSource: new mettleDataGridFakeSource.FakeLocalSource(mettleDataGridFakeSource.fakeDataSet3),
            id: "grid1"
        });
        grid1.load();
    });

}(jQuery, window.mettleDataGridFakeSource));

