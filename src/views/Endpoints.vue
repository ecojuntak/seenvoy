<script >
import { onMounted, onUnmounted } from '@vue/runtime-core';
import { endpointConfigs } from '../libs/envoy';
import { defineComponent, ref } from 'vue';
import { openDrawer } from '~/libs/drawer';
import JSONViewer from '../components/JSONViewer.vue';
export default defineComponent({
  setup() {
    const dataSource = ref([])
    onMounted(() => {
      endpointConfigs({ page_no: 1, page_size: 5000 }).then(data => {
        console.log(data);
        dataSource.value = data.items.map((el, idx) => { el.key = idx; return el })
      });
    });

    const openJSONDrawer = (row) => {
      openDrawer(JSONViewer, {
        modelValue: row
      })
    }

    const onDestinationClick = (row) => {
      console.log(row);
    }

    return {
      search: ref({}),
      listeners: ref([]),
      clusters: ref([]),
      openJSONDrawer,
      onDestinationClick,
      dataSource,
      columns: [
        {
          title: 'Name',
          dataIndex: 'cluster_name',
          key: 'name',
        },
        {
          title: 'Operation',
          key: 'action',
        },
      ],
    };
  },
});

</script>

<template>
  <div style="height: 100%">
    <a-table :dataSource="dataSource" :columns="columns">
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'action'">
          <a @click="openJSONDrawer(record)">View</a>
        </template>
      </template>
    </a-table>
  </div>
</template>

<style>
</style>
