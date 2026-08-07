<script setup lang="ts">
import { marked } from 'marked'

const version = __VERSION__
const changelog = __CHANGELOG__
const gitCommit = __GIT_COMMIT__
const gitURL = __GITHUB_URL__
const commitURL = `${gitURL}/commit/${gitCommit}`
</script>

<template>
  <div class="grid-area-[content]">
    <div class="grid-area-[version] self-start">
      <p>
        Version: {{ version }}
        <a
          class="text-green-500"
          :href="commitURL"
          target="_blank"
        >
          (#{{ gitCommit }})
        </a>
      </p>
      <h1>Changelog</h1>
    </div>
    <!-- eslint-disable vue/no-v-html -->
    <div
      class="prose changelog [&_input[type='checkbox']]:checkbox [&_input[type='checkbox']]:checkbox-info [&_input[type='checkbox']]:disabled:opacity-100 [&_table]:table [&_table]:table-zebra"
      v-html="marked(changelog)"
    />
    <!--eslint-enable-->
  </div>
</template>
