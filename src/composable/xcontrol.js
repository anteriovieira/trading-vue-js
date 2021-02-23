import { onMounted, ref, getCurrentInstance, computed, watch } from 'vue-demi'

export const useXControl = ({ extensions, xSettings, skin, skin_proto, data, resetChart = () => {} }) => {
    const ws = computed(() => {
        let _ws = {}
        for (var ctrl of controllers.value) {
            if (ctrl.widgets) {
                for (var id in ctrl.widgets) {
                    _ws[id] = ctrl.widgets[id]
                    _ws[id].ctrl = ctrl
                }
            }
        }
        return _ws
    })
    const instance = getCurrentInstance()
    const controllers = ref([])
    const skin_styles = () => {
        let id = 'tvjs-skin-styles'
        let stbr = document.getElementById(id)
        if (stbr) {
            let parent = stbr.parentNode
            parent.removeChild(stbr)
        }
        if (skin_proto.value && skin_proto.value.styles) {
            let sheet = document.createElement('style')
            sheet.setAttribute("id", id)
            sheet.innerHTML = skin_proto.value.styles
            instance.$el.appendChild(sheet)
        }
    }
    const ctrllist = () => {
        ctrl_destroy()
        controllers.value = []

        for (var x of extensions.value) {
            let name = x.Main.__name__
            if (!xSettings.value[name]) {
                xSettings.value[name] = {}
            }
            let nc = new x.Main(
                instance,   // tv inst
                data.value, // dc
                xSettings.value[name] // settings
            )
            nc.name = name
            controllers.value.push(nc)
        }
        return controllers.value
    }
    const pre_dc = (e) => {
        for (var ctrl of controllers.value) {
            if (ctrl.update) {
                ctrl.update(e)
            }
        }
    }
    const post_dc = (e) => {
        for (var ctrl of controllers.value) {
            if (ctrl.post_update) {
                ctrl.post_update(e)
            }
        }
    }
    const ctrl_destroy = () => {
        for (var ctrl of controllers.value) {
            if (ctrl.destroy) ctrl.destroy()
        }
    }

    onMounted(() => {
        ctrllist()
        skin_styles()
    })

    watch(skin, (n, p) => {
        if (n !== p) resetChart()
            skin_styles()
    })

    watch(extensions, () => {
        ctrllist()
    })

    watch(xSettings, (n, p) => {
        for (var ctrl of controllers.value) {
            if (ctrl.onsettings) {
                ctrl.onsettings(n, p)
            }
        }
    }, { deep: true })

    return {
        post_dc,
        pre_dc,
        ws,
        ctrl_destroy,
        controllers
    }
}