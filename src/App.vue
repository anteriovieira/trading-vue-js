<template>
    <trading-vue :data="chart" :width="width" :height="height"
        :color-back="colors.colorBack"
        :color-grid="colors.colorGrid"
        :color-text="colors.colorText">
    </trading-vue>
</template>

<script>
import { ref, reactive } from 'vue-demi'
import { useWindowSize } from '@vueuse/core'

import TradingVue from './TradingVue.vue'
import Data from '../data/data.json'
import DataCube from '../src/helpers/datacube.js'

export default {
    name: 'App',
    components: {
        TradingVue
    },
    setup () {
        const chart = ref(new DataCube(Data))
        const { width, height } = useWindowSize()
        const colors = reactive({
            colorBack: '#fff',
            colorGrid: '#eee',
            colorText: '#333',
        })

        window.dc = chart.value

        return {
            chart,
            width,
            height,
            colors
        }
    }
};
</script>

<style>
html,
body {
    background-color: #000;
    margin: 0;
    padding: 0;
    overflow: hidden;
}
</style>
