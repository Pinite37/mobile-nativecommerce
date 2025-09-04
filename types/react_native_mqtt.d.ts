declare module 'react_native_mqtt' {
  const init: (config: {
    size: number;
    storageBackend: any;
    defaultExpires: number;
    enableCache: boolean;
    reconnect: boolean;
    sync: any;
  }) => void;

  export default init;
}
