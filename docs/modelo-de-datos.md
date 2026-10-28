# Modelo de datos acordado

Modelo conceptual del control trabajado en Excel. No es una migración de base de datos. Las entidades permiten conservar cada documento como fue emitido y conciliar sus diferencias sin modificar la proforma original.

```mermaid
erDiagram
    PRODUCTO ||--o| PRODUCTO_COMPLEMENTO : complementa
    PROFORMA ||--|{ DETALLE_PROFORMA : contiene
    PRODUCTO ||--o{ DETALLE_PROFORMA : solicitado
    FACTURA ||--|{ DETALLE_FACTURA : contiene
    PRODUCTO ||--o{ DETALLE_FACTURA : facturado
    DETALLE_PROFORMA ||--o{ ASIGNACION : atendido_por
    DETALLE_FACTURA ||--o{ ASIGNACION : corresponde_a
    FACTURA ||--o| EMBARQUE : viaja_en
    FACTURA ||--o{ PAGO : recibe
    EMBARQUE ||--o{ RECEPCION : recibido_en
    RECEPCION ||--|{ DETALLE_RECEPCION : contiene
    DETALLE_FACTURA ||--o{ DETALLE_RECEPCION : recibido
    DETALLE_RECEPCION ||--o{ APLICACION_RECEPCION : distribuye
    ASIGNACION ||--o{ APLICACION_RECEPCION : recibido_para

    PRODUCTO {
        uuid id PK
        string codigo UK
        string codigo_producto_origen
        string nombre
        string estado
        string presentacion
    }
    PRODUCTO_COMPLEMENTO {
        uuid producto_id PK,FK
        string nombre_proveedor
        string proveedor
        string packing_referencia
    }
    PROFORMA {
        uuid id PK
        string numero
        date fecha_documento
        string moneda
    }
    DETALLE_PROFORMA {
        uuid id PK
        uuid proforma_id FK
        uuid producto_id FK
        int numero_linea
        decimal cantidad_pedida
        decimal cantidad_cancelada
        string unidad
        string packing
        decimal precio_unitario
    }
    FACTURA {
        uuid id PK
        string numero
        date fecha_emision
        string moneda
        decimal importe_documento
    }
    DETALLE_FACTURA {
        uuid id PK
        uuid factura_id FK
        uuid producto_id FK
        int numero_linea
        string referencia_proforma_documento
        decimal cantidad
        string unidad
        string packing
        decimal precio_unitario
    }
    ASIGNACION {
        uuid id PK
        uuid detalle_proforma_id FK
        uuid detalle_factura_id FK
        decimal cantidad
    }
    EMBARQUE {
        uuid id PK
        uuid factura_id FK,UK
        string numero_bl
        date fecha_bl
        date salida_estimada
        date salida_real
        date arica_estimada
        date arica_real
        date cochabamba_estimada
        date cochabamba_real
    }
    PAGO {
        uuid id PK
        uuid factura_id FK
        date fecha
        decimal importe
        string referencia
    }
    RECEPCION {
        uuid id PK
        uuid embarque_id FK
        date fecha_real
        string almacen
        string documento
    }
    DETALLE_RECEPCION {
        uuid id PK
        uuid recepcion_id FK
        uuid detalle_factura_id FK
        decimal cantidad_recibida
    }
    APLICACION_RECEPCION {
        uuid id PK
        uuid detalle_recepcion_id FK
        uuid asignacion_id FK
        decimal cantidad
    }
```

## Lectura del modelo

- Una proforma puede atenderse mediante varias facturas. Una factura puede atender varias proformas; la relación está en sus líneas, mediante ASIGNACION.
- Una factura corresponde a un BL. El embarque puede quedar pendiente de completar al registrar la factura, por eso la relación permite temporalmente cero embarques.
- Cada línea mantiene cantidad, unidad, packing y precio propios del documento. El packing del catálogo es solo una referencia.
- La referencia de proforma escrita por el proveedor se conserva aunque todavía no se pueda vincular a una proforma registrada.
- La recepción registra lo que llegó físicamente. Su aplicación a las asignaciones permite determinar qué proforma se recibió. Se admite registrar una recepción cuya conciliación esté pendiente, sin inventar una proforma de destino.
- DETALLE_RECEPCION y APLICACION_RECEPCION expresan en forma explícita el registro de recepción y su vínculo con la asignación ya previsto en el control. No representan nuevos pasos de aprobación para el usuario.
- El forecast se obtiene de estas relaciones; no se guarda como una tabla de totales que deba actualizarse manualmente.

## Identidad, archivos e historial

El código comercial se conserva como texto para no perder ceros iniciales. La clave de producto de la base de origen se conserva por separado y deberá validarse al importar. Las claves internas del nuevo sistema no sustituyen esos códigos comerciales.

El catálogo de la hoja PRODUCTO conectada a la base es la fuente principal. Los campos complementarios proceden de tProductos. Los productos históricos ausentes del catálogo actual deben mantenerse identificados para no perder sus movimientos.

Los PDFs se asociarán a proformas, facturas y pagos mediante registros de adjuntos y almacenamiento privado. Las modificaciones de documentos, fechas, asignaciones y recepciones deben registrar usuario, fecha y cambio. La implementación concreta de adjuntos, permisos e historial se definirá en las migraciones; no está desplegada.
