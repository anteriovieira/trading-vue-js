<template>
    <!-- Main component  -->
    <div
        :id="id"
        class="trading-vue"
        :style="{
            color: chart_props.colors.text,
            font: font_comp,
            width: width+'px',
            height: height+'px'
        }"
        @mousedown="mousedown"
        @mouseleave="mouseleave"
    >
        <toolbar
            v-if="toolbar"
            ref="toolbar"
            v-bind="chart_props"
            :config="chart_config"
            @custom-event="custom_event"
        />
        <widgets
            v-if="controllers.length"
            ref="widgets"
            :map="ws"
            :width="width"
            :height="height"
            :tv="this"
            :dc="data"
        />
        <chart
            :key="reset"
            ref="chart"
            v-bind="chart_props"
            :tv_id="id"
            :config="chart_config"
            @custom-event="custom_event"
            @range-changed="range_changed"
            @legend-button-click="legend_button"
        />
        <transition name="tvjs-drift">
            <the-tip
                v-if="tip"
                :data="tip" 
                @remove-me="tip = null"
            />
        </transition>
    </div>
</template>

<script>
import { ref, computed, getCurrentInstance, nextTick, onBeforeUnmount } from 'vue-demi'

import Const from './stuff/constants.js'
import Chart from './components/Chart.vue'
import Toolbar from './components/Toolbar.vue'
import Widgets from './components/Widgets.vue'
import TheTip from './components/TheTip.vue'

import { useXControl } from './composable/xcontrol'

export default {
    name: 'TradingVue',
    components: {
        Chart, Toolbar, Widgets, TheTip
    },
    props: {
        titleTxt: {
            type: String,
            default: 'TradingVue.js'
        },
        id: {
            type: String,
            default: 'trading-vue-js'
        },
        width: {
            type: Number,
            default: 800
        },
        height: {
            type: Number,
            default: 421
        },
        colorTitle: {
            type: String,
            default: '#42b883'
        },
        colorBack: {
            type: String,
            default: '#121826'
        },
        colorGrid: {
            type: String,
            default: '#2f3240'
        },
        colorText: {
            type: String,
            default: '#dedddd'
        },
        colorTextHL: {
            type: String,
            default: '#fff'
        },
        colorScale: {
            type: String,
            default: '#838383'
        },
        colorCross: {
            type: String,
            default: '#8091a0'
        },
        colorCandleUp: {
            type: String,
            default: '#23a776'
        },
        colorCandleDw: {
            type: String,
            default: '#e54150'
        },
        colorWickUp: {
            type: String,
            default: '#23a77688'
        },
        colorWickDw: {
            type: String,
            default: '#e5415088'
        },
        colorWickSm: {
            type: String,
            default: 'transparent' // deprecated
        },
        colorVolUp: {
            type: String,
            default: '#79999e42'
        },
        colorVolDw: {
            type: String,
            default: '#ef535042'
        },
        colorPanel: {
            type: String,
            default: '#565c68'
        },
        colorTbBack: {
            type: String
        },
        colorTbBorder: {
            type: String,
            default: '#8282827d'
        },
        colors: {
            type: Object
        },
        font: {
            type: String,
            default: Const.ChartConfig.FONT
        },
        toolbar: {
            type: Boolean,
            default: false
        },
        data: {
            type: Object,
            required: true
        },
        // Your overlay classes here
        overlays: {
            type: Array,
            default: function () { return [] }
        },
        // Overwrites ChartConfig values,
        // see constants.js
        chartConfig: {
            type: Object,
            default: function () { return {} }
        },
        legendButtons: {
            type: Array,
            default: function () { return [] }
        },
        indexBased: {
            type: Boolean,
            default: false
        },
        extensions: {
            type: Array,
            default: function () { return [] }
        },
        xSettings: {
            type: Object,
            default: function () { return {} }
        },
        skin: {
            type: String // Skin Name
        },
        timezone: {
            type: Number,
            default: 0
        }
    },
    computed: {
        // Copy a subset of TradingVue props
        chart_props() {
            let offset = this.$props.toolbar ?
                this.chart_config.TOOLBAR : 0
            let chart_props = {
                title_txt: this.$props.titleTxt,
                overlays: this.$props.overlays.concat(this.mod_ovs),
                data: this.decubed,
                width: this.$props.width - offset,
                height: this.$props.height,
                font: this.font_comp,
                buttons: this.$props.legendButtons,
                toolbar: this.$props.toolbar,
                ib: this.$props.indexBased || this.index_based || false,
                colors: Object.assign({}, this.$props.colors ||
                    this.colorpack),
                skin: this.skin_proto,
                timezone: this.$props.timezone
            }

            this.parse_colors(chart_props.colors)
            return chart_props
        },
        index_based() {
            const base = this.$props.data
            if (base.chart) {
                return base.chart.indexBased
            }
            else if (base.data) {
                return base.data.chart.indexBased
            }
            return false
        },
        mod_ovs() {
            let arr = []
            for (var x of this.$props.extensions) {
                arr.push(...Object.values(x.overlays))
            }
            return arr
        },
        font_comp() {
            return this.skin_proto && this.skin_proto.font ?
                this.skin_proto.font : this.font
        }
    },
    setup (props, { emit }) {
        const instance = getCurrentInstance()
        const data = computed(() => props.data)
        const skin = computed(() => props.skin)
        const xSettings = computed(() => props.xSettings)
        const extensions = computed(() => props.extensions)
        const reset = ref(0)
        const tip = ref(null)
        const chart = ref(null)
        let onrange = null

        // TODO implements resetChart
        const {
            computed: comp
        } = instance.proxy.$options

        const colorpack = computed(() => {
            let sel = skins.value[skin.value]
            return sel ? sel.colors : undefined
        })
        const skins = computed(() => {
            let sks = {}
            for (var x of extensions.value) {
                for (var id in x.skins || {}) {
                    sks[id] = x.skins[id]
                }
            }
            return sks
        })
        const skin_proto = computed(() => {
            return skins.value[skin.value]
        })
        const chart_config = computed(() => {
            return Object.assign({},
                Const.ChartConfig,
                props.chartConfig,
            )
        })
        console.log(instance)
        const decubed = computed(() => {
            let base = props.data
            if (base.data !== undefined) {
                // DataCube detected
                base.init_tvjs(instance.proxy)
                return base.data
            } else {
                return base
            }
        })
        const chart_props = computed(() => comp.chart_props)

        const setRange = (t1, t2) => {
            if (chart_props.value.ib) {
                const ti_map = chart.value.ti_map
                const ohlcv = chart.value.ohlcv
                t1 = ti_map.gt2i(t1, ohlcv)
                t2 = ti_map.gt2i(t2, ohlcv)
            }
            chart.value.setRange(t1, t2)
        }

        const getRange = () => {
            if (chart_props.value.ib) {
                const ti_map = chart.value.ti_map
                // Time range => index range
                return chart.value.range.map(x => ti_map.i2t(x))
            }

            return chart.value ? chart.value.range : []
        }

        // TODO: reset extensions?
        const resetChart = async (resetRange = true) => {
            reset.value++

            let range = getRange()
            if (!resetRange && range[0] && range[1]) {
                await nextTick()

                setRange(...range)
            }

            await nextTick()
            custom_event({ event: 'chart-reset', args: [] })
        }

        const { ctrl_destroy, pre_dc, post_dc, controllers, ws } = useXControl({
            xSettings, data, skin, extensions, resetChart, skin_proto
        })

        function custom_event (d) {
            if ('args' in d) {
                emit(d.event, ...d.args)
            } else {
                emit(d.event)
            }

            let data = props.data
            let ctrl = controllers.value.length !== 0

            if (ctrl) pre_dc(d)
            if (data.tv) {
                // If the data object is DataCube
                data.on_custom_event(d.event, d.args)
            }
            if (ctrl) post_dc(d)
        }

        const goto = (t) => {
            // TODO: limit goto & setRange (out of data error)
            if (chart_props.value.ib) {
                const ti_map = chart.value.ti_map
                t = ti_map.gt2i(t, chart.value.ohlcv)
            }
            chart.value.goto(t)
        }

        const getCursor = () => {
            let cursor = chart.value.cursor
            if (chart_props.value.ib) {
                const ti_map = chart.value.ti_map
                let copy = Object.assign({}, cursor)
                copy.i = copy.t
                copy.t = ti_map.i2t(copy.t)
                return copy
            }

            return cursor
        }

        const showTheTip = (text, color = "orange") => {
            tip.value = { text, color }
        }

        const legend_button = (event) => {
            custom_event({ event: 'legend-button-click', args: [event] })
        }

        const range_changed = (r) => {
            if (chart_props.value.ib) {
                const ti_map = chart.value.ti_map
                r = r.map(x => ti_map.i2t(x))
            }

            emit('range-changed', r)

            custom_event({ event: 'range-changed', args: [r] })

            if (onrange) {
                onrange(r)
            }
        }

        const set_loader = (dc) => {
            onrange = r => {
                let pf = chart_props.value.ib ? '_ms' : ''
                let tf = chart.value['interval' + pf]
                dc.range_changed(r, tf)
            }
        }

        const parse_colors = (colors) => {
            for (var k in props) {
                if (k.indexOf('color') === 0 && k !== 'colors') {
                    let k2 = k.replace('color', '')
                    k2 = k2[0].toLowerCase() + k2.slice(1)
                    if (colors[k2]) continue
                    colors[k2] = props[k]
                }
            }
        }

        const mousedown = () => {
            chart.value.activated = true
        }

        const mouseleave = () => {
            chart.value.activated = false
        }

        onBeforeUnmount(() => {
            custom_event({ event: 'before-destroy' })
            ctrl_destroy()
        })

        return {
            reset,
            tip,
            ctrl_destroy,
            pre_dc,
            post_dc,
            controllers,
            chart,
            goto,
            setRange,
            getRange,
            getCursor,
            showTheTip,
            legend_button,
            custom_event,
            range_changed,
            set_loader,
            parse_colors,
            mousedown,
            mouseleave,
            skin_proto,
            ws,
            colorpack,
            chart_config,
            decubed
        }
    }
}
</script>
<style>
/* Anit-boostrap tactix */
.trading-vue *, ::after, ::before {
    box-sizing: content-box;
}
.trading-vue img {
    vertical-align: initial;
}
</style>
