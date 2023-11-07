/* globals seConfirm */
/**
 * @file ext-django_opensave.js
 *
 * @license MIT
 *
 * @copyright 2020 OptimistikSAS
 * @copyright 2023 KSW ##TODO CHECK LICENCE!
 *
 */
/**
   * @type {module:svgcanvas.EventHandler}
   * @param {external:Window} wind
   * @param {module:svgcanvas.SvgCanvas#event:saved} svg The SVG source
   * @listens module:svgcanvas.SvgCanvas#event:saved
   * @returns {void}
   */
/* import { fileOpen, fileSave } from 'browser-fs-access' */
const name = 'django_opensave'
let handle = null

const fileSave = async function(url,data, csrfToken) {
  var xhr = new XMLHttpRequest();
  xhr.open("POST", url, true);
  xhr.setRequestHeader('Content-Type', 'image/svg+xml');
  xhr.setRequestHeader('X-CSRFToken', csrfToken);
  xhr.send(JSON.stringify({
    value: data
}));


}

const loadExtensionTranslation = async function (svgEditor) {
  let translationModule
  const lang = svgEditor.configObj.pref('lang')
  try {
    translationModule = await import(`./locale/${lang}.js`)
  } catch (_error) {
    console.warn(`Missing translation (${lang}) for ${name} - using 'en'`)
    translationModule = await import('./locale/en.js')
  }
  svgEditor.i18next.addResourceBundle(lang, 'translation', translationModule.default, true, true)
}

export default {
  name,
  async init (_S) {
    const svgEditor = this
    const { svgCanvas } = svgEditor
    const { $id, $click } = svgCanvas
    await loadExtensionTranslation(svgEditor)
    /**
     * @param {Event} e
     * @returns {void}
     */


    const b64toBlob = (b64Data, contentType = '', sliceSize = 512) => {
      const byteCharacters = atob(b64Data)
      const byteArrays = []
      for (let offset = 0; offset < byteCharacters.length; offset += sliceSize) {
        const slice = byteCharacters.slice(offset, offset + sliceSize)
        const byteNumbers = new Array(slice.length)
        for (let i = 0; i < slice.length; i++) {
          byteNumbers[i] = slice.charCodeAt(i)
        }
        const byteArray = new Uint8Array(byteNumbers)
        byteArrays.push(byteArray)
      }
      const blob = new Blob(byteArrays, { type: contentType })
      return blob
    }

    /**
     *
     * @returns {void}
     */
    const clickSave = async function (type) {
      const $editorDialog = $id('se-svg-editor-dialog')
      const editingsource = $editorDialog.getAttribute('dialog') === 'open'
      if (editingsource) {
        svgEditor.saveSourceEditor()
      } else {
        // In the future, more options can be provided here
        const saveOpts = {
          images: svgEditor.configObj.pref('img_save'),
          round_digits: 2
        }
        // remove the selected outline before serializing
        svgCanvas.clearSelection()
        // Update save options if provided
        if (saveOpts) {
          const saveOptions = svgCanvas.mergeDeep(svgCanvas.getSvgOption(), saveOpts)
          for (const [key, value] of Object.entries(saveOptions)) {
            svgCanvas.setSvgOption(key, value)
          }
        }
        svgCanvas.setSvgOption('apply', true)

        // no need for doctype, see https://jwatt.org/svg/authoring/#doctype-declaration
        const svg = '<?xml version="1.0"?>\n' + svgCanvas.svgCanvasToString()
        const b64Data = svgCanvas.encode64(svg)
        //const blob = b64toBlob(b64Data, 'image/svg+xml')
        try {
          if (type === 'save' && handle !== null) {
            const throwIfExistingHandleNotGood = false
            handle = await fileSave(svgEditor.current_url,b64Data, svgEditor.csrfToken, handle, throwIfExistingHandleNotGood)
          } else {
            handle = await fileSave(svgEditor.current_url,b64Data,svgEditor.csrfToken)
          }
          //svgEditor.topPanel.updateTitle(handle.name)
          /* svgCanvas.runExtensions('onSavedDocument', {
            name: handle.name,
            kind: handle.kind
          }) */
        } catch (err) {
          if (err.name !== 'AbortError') {
            return console.error(err)
          }
        }
      }
    }

    return {
      name: svgEditor.i18next.t(`${name}:name`),
      // The callback should be used to load the DOM with the appropriate UI items
      callback () {

        const saveButtonTemplate = '<se-menu-item id="tool_django_save" label="django_opensave.save_doc" shortcut="S" src="saveImg.svg"></se-menu-item>'
        svgCanvas.insertChildAtIndex($id('main_button'), saveButtonTemplate, 2)
        // handler

        $click($id('tool_django_save'), clickSave.bind(this, 'save'))

      }
    }
  }
}
