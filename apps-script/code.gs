function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.tryLock(10000);

  try {
    var data = JSON.parse(e.postData.contents);
    var txId = data.id;

    // 1. Быстрая проверка в оперативном кэше (работает до 6 часов)
    if (txId) {
      var cache = CacheService.getScriptCache();
      if (cache.get('tx_' + txId)) {
        return ContentService.createTextOutput(JSON.stringify({ 
          status: 'duplicate_ignored', 
          id: txId 
        })).setMimeType(ContentService.MimeType.JSON);
      }
    }
    
    var sheetId = "MY_SHEET_ID"; 
    var ss = SpreadsheetApp.openById(sheetId);
    
    // Определяем лист по месяцу из даты (формат ДД.ММ.ГГГГ)
    var dateParts = data.date.split(".");
    var monthIndex = parseInt(dateParts[1], 10) - 1;
    var monthsSheets = ["Январь", "Февраль", "Март", "Апрель", "Май", "Июнь", "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"];
    var sheetName = monthsSheets[monthIndex];
    var sheet = ss.getSheetByName(sheetName);
    
    if (!sheet) {
      return ContentService.createTextOutput(JSON.stringify({
        "status": "error", 
        "message": "Лист не найден"
      })).setMimeType(ContentService.MimeType.JSON);
    }

    var lastRow = sheet.getLastRow();

    // 2. Постоянная проверка по 7-й колонке (G) в самой таблице (работает всегда)
    if (txId && lastRow >= 2) {
      // Читаем все существующие ID из столбца G (начиная со 2-й строки, пропускаем шапку)
      var existingIds = sheet.getRange(2, 7, lastRow - 1, 1).getValues();
      for (var i = 0; i < existingIds.length; i++) {
        if (String(existingIds[i][0]) === String(txId)) {
          // Дубликат найден в таблице — обновляем кэш и возвращаем успех клиенту
          CacheService.getScriptCache().put('tx_' + txId, '1', 21600);
          return ContentService.createTextOutput(JSON.stringify({ 
            status: 'duplicate_ignored', 
            id: txId 
          })).setMimeType(ContentService.MimeType.JSON);
        }
      }
    }
    
    var targetRow = lastRow + 1;
    
    // Записываем данные в колонки A–G (1–7)
    sheet.getRange(targetRow, 1).setValue(data.date);
    sheet.getRange(targetRow, 2).setValue(data.type);
    sheet.getRange(targetRow, 3).setValue(parseFloat(data.amount));
    sheet.getRange(targetRow, 4).setValue(data.category);
    sheet.getRange(targetRow, 5).setValue(data.note || "");
    sheet.getRange(targetRow, 6).setValue(data.geoLink || "");
    sheet.getRange(targetRow, 7).setValue(txId || "");

    // Автоматически скрываем 7-ю колонку (G), если она еще видна
    // if (!sheet.isColumnHiddenByUser(7)) {
    //   sheet.hideColumns(7);
    // }

    // Сохраняем ID в быстрый кэш
    if (txId) {
      CacheService.getScriptCache().put('tx_' + txId, '1', 21600);
    }
    
    return ContentService.createTextOutput(JSON.stringify({
      "status": "success", 
      "id": txId 
    })).setMimeType(ContentService.MimeType.JSON);
                        
  } catch(error) {
    return ContentService.createTextOutput(JSON.stringify({
      "status": "error", 
      "message": error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}
