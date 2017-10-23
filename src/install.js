/* eslint-disable import/no-mutable-exports */
import deepmerge from 'deepmerge';
import component from './component';

export let Vue;

export function install(_Vue) {
  if (install.installed) {
    return;
  }
  install.installed = true;

  Vue = _Vue;

  const getByKey = (i18nOptions, i18nextOptions) => (key) => {
    if (i18nOptions && i18nOptions.keyPrefix && !key.includes(i18nextOptions.nsSeparator)) {
      return `${i18nOptions.keyPrefix}.${key}`;
    }
    return key;
  };

  Vue.mixin({
    computed: {
      $t() {
        const getKey = getByKey(this._i18nOptions, this.$i18n.i18next.options);

        if (this._i18nOptions && this._i18nOptions.namespacesToLoad) {
          const { lng, namespacesToLoad } = this._i18nOptions;
          const fixedT = this.$i18n.i18next.getFixedT(lng, namespacesToLoad);

          return (key, options) => {
            console.log(lng, namespacesToLoad);
            return fixedT(getKey(key), options, this.$i18n.i18nLoadedAt);
          };
        }

        return (key, options) =>
          this.$i18n.i18next.t(getKey(key), options, this.$i18n.i18nLoadedAt);
      },
    },

    beforeCreate() {
      const options = this.$options;
      if (options.i18n) {
        this.$i18n = options.i18n;
      } else if (options.parent && options.parent.$i18n) {
        this.$i18n = options.parent.$i18n;
      }

      if (this.$i18n) {
        const defaultNS = this.$i18n.i18next.options.defaultNS;
        const parentOptions =
          options.parent && options.parent._i18nOptions ? options.parent._i18nOptions : null;

        let inlineTranslations = {};
        if (options.__i18n) {
          options.__i18n.forEach((resource) => {
            inlineTranslations = deepmerge(inlineTranslations, JSON.parse(resource));
          });
        }

        const namespace = options.name || options._componentTag || `${Math.random()}`;
        let parentsNamespaces = [];
        if (parentOptions && parentOptions.namespace) {
          parentsNamespaces = [parentOptions.namespace, ...(parentOptions.parentsNamespaces || [])];
        }

        if (options.i18nOptions) {
          let namespacesToLoad = [];
          const { keyPrefix = null, messages } = options.i18nOptions;
          let { namespaces, lng = null } = options.i18nOptions;
          if (typeof namespaces === 'string') namespaces = [namespaces];

          if (!namespaces) {
            if (parentOptions && parentOptions.namespaces) {
              namespaces = parentOptions.namespaces;
              namespacesToLoad = [
                ...new Set([...parentOptions.namespaces, namespace, ...parentsNamespaces]),
              ];
            } else {
              namespacesToLoad = [...defaultNS, namespace, ...parentsNamespaces];
            }
          } else {
            namespacesToLoad = [...namespaces, namespace, ...parentsNamespaces];
          }

          if (!lng && parentOptions && parentOptions.lng) {
            lng = parentOptions.lng;
          }

          if (messages) {
            inlineTranslations = deepmerge(inlineTranslations, messages);
          }

          this._i18nOptions = {
            lng,
            namespace,
            namespaces,
            namespacesToLoad,
            parentsNamespaces,
            keyPrefix,
          };
          this.$i18n.i18next.loadNamespaces(namespacesToLoad);
        } else if (parentOptions) {
          this._i18nOptions = { ...parentOptions, namespace, parentsNamespaces };
          this._i18nOptions.namespacesToLoad = [
            ...(parentOptions.namespaces || defaultNS),
            namespace,
            ...parentsNamespaces,
          ];
          this.$i18n.i18next.loadNamespaces(namespace);
        } else if (options.__i18n) {
          this._i18nOptions = { namespace, parentsNamespaces };
          this._i18nOptions.namespacesToLoad = [...defaultNS, namespace, ...parentsNamespaces];
          this.$i18n.i18next.loadNamespaces([...defaultNS, namespace]);
        }

        // TODO: do it only once per component namespace
        const languages = Object.keys(inlineTranslations);
        languages.forEach((lang) => {
          this.$i18n.i18next.addResourceBundle(
            lang,
            namespace,
            { ...inlineTranslations[lang] },
            true,
            false,
          );
        });
      }
    },
  });

  Vue.component(component.name, component);
}
