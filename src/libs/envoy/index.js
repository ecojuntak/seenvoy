import axios from "./axios";
import { count, db, query } from "./db";

export const fetch_config_dump = async (include_eds) => {
    const url = include_eds ? "/config_dump?include_eds" : "/config_dump";
    const response = await axios.get(url);
    return response.data.configs.map(config => ({ ...config, key: config["@type"] }));
}

export const sync_config_dump = async (include_eds) => {
    const configs = await fetch_config_dump(include_eds);
    console.log(configs);
    const cfg = new Configs(configs);

    try {
        await Promise.all([
            db.bootstrap.clear(),
            db.listeners.clear(), 
            db.routes.clear(),
            db.clusters.clear(),
            db.endpoints.clear()
        ]);

        await Promise.all([
            db.bootstrap.add(cfg.getBootstrapConfig()),
            db.listeners.bulkAdd(cfg.getListenerConfigs()),
            db.routes.bulkAdd(cfg.getRouteConfigs()),
            db.clusters.bulkAdd(cfg.getClusterConfigs()),
            db.endpoints.bulkAdd(cfg.getEndpointConfigs())
        ]);
    } catch (error) {
        console.error('Error syncing config dump:', error);
    }
}

export const statistic = async () => ({
    listeners: await count('listeners'),
    routes: await count('routes'),
    clusters: await count('clusters'),
    endpoints: await count('endpoints'),
});


export const bootstrapConfig = () => db.bootstrap.toCollection().last();
export const listenerConfigs = (param) => query('listeners', param);
export const routeConfigs = (param) => query('routes', param);
export const clusterConfigs = (param) => query('clusters', param);
export const endpointConfigs = (param) => query('endpoints', param);

export const inject = (key, value) => (el) => ({ ...el, [key]: value });

export class Configs {
    constructor(configs) {
        this.configs = configs;
    }

    findConfig(type) {
        return this.configs.find(d => d["@type"].endsWith(type));
    }

    getBootstrapConfig() {
        return this.findConfig("BootstrapConfigDump").bootstrap;
    }

    getListenerConfigs() {
        const lcd = this.findConfig("ListenersConfigDump");
        const configs = [];

        if (lcd?.static_listeners) {
            configs.push(...lcd.static_listeners.map(ln => ({ ...ln.listener, _static: true })));
        }

        if (lcd?.dynamic_listeners) {
            configs.push(...lcd.dynamic_listeners.map(item => item.active_state.listener));
        }

        return configs.map(el => ({
            ...el,
            traffic_direction: el.traffic_direction || 'UNSPECIFIED'
        }));
    }

    getRouteConfigs() {
        const rcd = this.findConfig("v3.RoutesConfigDump");
        const configs = [];

        if (rcd?.static_route_configs) {
            configs.push(...rcd.static_route_configs.map(item => ({ ...item.route_config, _static: true })));
        }

        if (rcd?.dynamic_route_configs) {
            configs.push(...rcd.dynamic_route_configs.map(item => item.route_config));
        }

        return configs;
    }

    getClusterConfigs() {
        const ccd = this.findConfig("v3.ClustersConfigDump");
        const configs = [];

        if (ccd?.static_clusters) {
            configs.push(...ccd.static_clusters.map(item => ({ ...item.cluster, _static: true })));
        }

        if (ccd?.dynamic_active_clusters) {
            configs.push(...ccd.dynamic_active_clusters.map(item => item.cluster));
        }

        return configs;
    }

    getEndpointConfigs() {
        const ecd = this.findConfig("v3.EndpointsConfigDump");
        const configs = [];

        if (ecd?.static_endpoint_configs) {
            configs.push(...ecd.static_endpoint_configs.map(item => ({ ...item.endpoint_config, _static: true })));
        }

        if (ecd?.dynamic_endpoint_configs) {
            configs.push(...ecd.dynamic_endpoint_configs.map(item => item.endpoint_config));
        }

        return configs;
    }
}

export const listeners = async () => {
    const response = await axios.get('/listeners?format=json');
    return response.data.listener_statuses;
}

export const clusterStatuses = async () => {
    const response = await axios.get('/clusters?format=json');
    return response.data.cluster_statuses;
}

export const buildEndpointName = (endpoint) => {
    const { address } = endpoint;
    return address.socket_address 
        ? `${address.socket_address.address}:${address.socket_address.port_value}`
        : address.pipe.path;
}

export * from "./relation";