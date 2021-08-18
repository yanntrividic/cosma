const {
        app, // app event lifecycle, events
        BrowserWindow, // app windows generator
        ipcMain, // interface of data exchange
        dialog
    } = require('electron')
    , path = require('path')
    , fs = require('fs')
    , moment = require('moment');

moment.locale('fr-ca');

const windowsModel = require('../../models/windows')
    , mainWindow = require('../../../main').mainWindow
    , History = require('../../models/history');

let window, modalRename;

module.exports = function () {

    /**
     * Window
     * ---
     * manage displaying
     */

    window = new BrowserWindow (
        Object.assign(windowsModel.forms, {
            title: 'Historique'
        })
    );

    window.loadFile(path.join(__dirname, './main-source.html'));

    window.once('ready-to-show', () => {
        window.show();
    });
}

/**
 * API
 * ---
 * manage data
 */

ipcMain.on("askHistoryList", (event, data) => {
    const historyRecords = History.getList()
        // .map(function (record) {
        //     splitDate = record.split('-');

        //     return {
        //         name: moment(splitDate).format('L, LTS'),
        //         id: record
        //     };
        // })
    
    window.webContents.send("getHistoryList", historyRecords);
});

ipcMain.on("sendCosmoscopeFromHistoryList", (event, recordId) => {
    const cosmoscopePath = path.join(History.path, recordId, 'cosmoscope.html');
    mainWindow.webContents.loadFile(cosmoscopePath);
});

ipcMain.on("sendHistoryToDelete", (event, date) => {
    const result = History.delete(date);
    let response;

    if (result === true) {
        response = {
            isOk: true,
            consolMsg: 'L\'entrée d\'historique a bien été supprimée'
        }
    } else {
        response = {
            isOk: false,
            consolMsg: 'L\'entrée d\'historique n\'a pas été supprimée'
        }
    }

    window.webContents.send("confirmHistoryDelete", response);
});

ipcMain.on("askRenameHistoryModal", (event, recordId) => {
    modalRename = new BrowserWindow (
        Object.assign(windowsModel.modal, {
            parent: window,
            title: 'Renommer un enregistrement'
        })
    );

    modalRename.loadFile(path.join(__dirname, './modal-rename-source.html'));

    const recordFromHistory = new History(recordId);

    modalRename.once('ready-to-show', () => {
        modalRename.show();
        modalRename.webContents.send("getMetasHistory", {
            id: recordId,
            name: recordFromHistory.metas.name
        });
    });
});

ipcMain.on("sendNewHistoryName", (event, data) => {
    const recordFromHistory = new History(data.id);
    recordFromHistory.metas.name = data.name;
    const result = recordFromHistory.saveMetas();

    let response = {
        isOk: true,
        consolMsg: 'L\'entrée d\'historique a été renommée',
        data: data
    }

    modalRename.close();

    window.webContents.send("confirmRenameHistory", response);
});

ipcMain.on("askCosmoscopeExportFromHistory", (event, recordId) => {
    const recordFromHistory = new History(recordId);

    dialog.showSaveDialog(window, {
        title: 'Enregistrer depuis l\'historique',
        defaultPath: 'cosmoscope.html',
        properties: ['createDirectory', 'showOverwriteConfirmation']
    }).then((response) => {
        if (response.canceled === false) {
            let dialogPath = response.filePath;

            if (['.html', '.htm'].includes(path.extname(response.filePath)) === false) {
                dialogPath = `${dialogPath}.html`
            }

            fs.copyFile(path.join(recordFromHistory.pathToStore, 'cosmoscope.html'), dialogPath, (err) => {
                if (err) { throw err; }
            });
        }
    });

});